// ============================================
// FILE: server/routes/purchaseInvoices.js
// Purchase Invoice Management Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import PurchaseInvoice from '../models/PurchaseInvoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Client from '../models/Client.js';
import Organization from '../models/Organization.js';

const router = express.Router();

router.use(protect);

// ============================================
// GET ROUTES
// ============================================

// Get all Purchase Invoices
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, vendorId, search, linkedPO } = req.query;

    const filter = { organization: organizationId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (vendorId) {
      filter.vendor = vendorId;
    }

    if (linkedPO) {
      filter.linkedPO = linkedPO;
    }

    let pis;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pis = await PurchaseInvoice.find({
        ...filter,
        $or: [
          { piNumber: searchRegex },
          { vendorReferenceNumber: searchRegex },
          { notes: searchRegex },
          { 'items.description': searchRegex },
        ],
      })
        .populate('vendor', 'companyName email gstin')
        .populate('linkedPO', 'poNumber')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ piDate: -1 });
    } else {
      pis = await PurchaseInvoice.find(filter)
        .populate('vendor', 'companyName email gstin')
        .populate('linkedPO', 'poNumber')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ piDate: -1 });
    }

    res.json(pis);
  } catch (error) {
    console.error('Error fetching Purchase Invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single Purchase Invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate('vendor')
      .populate('linkedPO')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .populate('payments.recordedBy', 'name email');

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    res.json(pi);
  } catch (error) {
    console.error('Error fetching Purchase Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREATE ROUTE
// ============================================

router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    const organization = await Organization.findById(organizationId);
    
    // Generate PI number
    const piCount = await PurchaseInvoice.countDocuments({ organization: organizationId });
    const piNumber = `PI-${String(piCount + 1).padStart(5, '0')}`;

    // Create Purchase Invoice
    const pi = await PurchaseInvoice.create({
      piNumber,
      piDate: data.piDate,
      dueDate: data.dueDate,
      vendor: data.vendorId,
      linkedPO: data.linkedPOId || null,
      vendorReferenceNumber: data.vendorReferenceNumber,
      items: data.items.map((item) => ({
        description: item.description,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
        gstRate: item.gstRate || 18,
        gstAmount: (item.amount * (item.gstRate || 18)) / 100,
      })),
      subtotal: data.subtotal,
      gstAmount: data.gstAmount,
      totalAmount: data.totalAmount,
      paidAmount: 0,
      balanceAmount: data.totalAmount,
      notes: data.notes || '',
      termsConditions: data.termsConditions || '',
      status: data.status || 'DRAFT',
      createdBy: req.user.id,
      organization: organizationId,
    });

    const populatedPI = await PurchaseInvoice.findById(pi._id)
      .populate('vendor')
      .populate('linkedPO')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedPI);
  } catch (error) {
    console.error('Error creating Purchase Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UPDATE ROUTES
// ============================================

// Update Purchase Invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    // Prevent editing if already approved
    if (pi.status === 'APPROVED' && data.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot edit an approved invoice' });
    }

    // Update fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== '_id') {
        pi[key] = data[key];
      }
    });

    await pi.save();

    const updatedPI = await PurchaseInvoice.findById(pi._id)
      .populate('vendor')
      .populate('linkedPO')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json(updatedPI);
  } catch (error) {
    console.error('Error updating Purchase Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve Purchase Invoice
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    if (pi.status === 'APPROVED') {
      return res.status(400).json({ error: 'Invoice is already approved' });
    }

    if (pi.status === 'REJECTED' || pi.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot approve a rejected/cancelled invoice' });
    }

    pi.status = 'APPROVED';
    pi.approvedBy = req.user.id;
    pi.approvedAt = new Date();

    await pi.save();

    const updatedPI = await PurchaseInvoice.findById(pi._id)
      .populate('vendor')
      .populate('linkedPO')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json(updatedPI);
  } catch (error) {
    console.error('Error approving Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject Purchase Invoice
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.user.organizationId;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    if (pi.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot reject an approved invoice' });
    }

    pi.status = 'REJECTED';
    pi.rejectionReason = reason || '';
    pi.rejectedBy = req.user.id;
    pi.rejectedAt = new Date();

    await pi.save();

    const updatedPI = await PurchaseInvoice.findById(pi._id)
      .populate('vendor')
      .populate('linkedPO')
      .populate('createdBy', 'name email')
      .populate('rejectedBy', 'name email');

    res.json(updatedPI);
  } catch (error) {
    console.error('Error rejecting Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE ROUTE
// ============================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    // Prevent deletion if approved or partially paid
    if (pi.status === 'APPROVED' || pi.paidAmount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete an approved or partially paid invoice' 
      });
    }

    await pi.deleteOne();

    res.json({ message: 'Purchase Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting Purchase Invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAYMENT ROUTES
// ============================================

// Record Payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMode, referenceNumber, notes } = req.body;
    const organizationId = req.user.organizationId;

    const pi = await PurchaseInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!pi) {
      return res.status(404).json({ error: 'Purchase Invoice not found' });
    }

    if (amount > pi.balanceAmount) {
      return res.status(400).json({ error: 'Payment amount exceeds balance' });
    }

    pi.payments.push({
      amount,
      paymentDate,
      paymentMode,
      referenceNumber,
      notes,
      recordedBy: req.user.id,
    });

    pi.paidAmount = (pi.paidAmount || 0) + amount;
    pi.balanceAmount = pi.totalAmount - pi.paidAmount;

    // Update status based on payment
    if (pi.balanceAmount <= 0) {
      pi.status = 'PAID';
    } else if (pi.paidAmount > 0) {
      pi.status = 'PARTIALLY_PAID';
    }

    await pi.save();

    const updatedPI = await PurchaseInvoice.findById(pi._id)
      .populate('vendor')
      .populate('linkedPO')
      .populate('payments.recordedBy', 'name email');

    res.json(updatedPI);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS ROUTE
// ============================================

router.get('/stats/overview', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const stats = await PurchaseInvoice.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
    ]);

    const totalInvoices = await PurchaseInvoice.countDocuments({ 
      organization: organizationId 
    });
    
    const totalValue = await PurchaseInvoice.aggregate([
      { $match: { organization: organizationId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      stats,
      totalInvoices,
      totalValue: totalValue[0]?.total || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;