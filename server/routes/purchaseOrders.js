// ============================================
// FILE: server/routes/purchaseOrders.js
// ✅ FIXED: Proper PO Number Generation
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';

const router = express.Router();

router.use(protect);

// Get all POs
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, vendorId, search } = req.query;

    const filter = { organization: organizationId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (vendorId) {
      filter.vendor = vendorId;
    }

    let pos;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pos = await PurchaseOrder.find({
        ...filter,
        $or: [
          { poNumber: searchRegex },
          { notes: searchRegex },
          { 'items.description': searchRegex },
        ],
      })
        .populate('vendor', 'companyName email gstin')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });
    } else {
      pos = await PurchaseOrder.find(filter)
        .populate('vendor', 'companyName email gstin')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json(pos);
  } catch (error) {
    console.error('Error fetching POs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single PO
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('payments.recordedBy', 'name email')
      .populate('linkedInvoices.invoice');

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    res.json(po);
  } catch (error) {
    console.error('Error fetching PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FIXED: Create PO with proper number generation
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    // ✅ FIX: Generate PO number based on existing POs, not invoice numbers
    const poCount = await PurchaseOrder.countDocuments({ 
      organization: organizationId 
    });
    
    const poNumber = `PO-${String(poCount + 1).padStart(4, '0')}`;
    
    console.log(`🔢 Generating PO Number: ${poNumber} (Total POs: ${poCount})`);

    const po = await PurchaseOrder.create({
      poNumber,
      poDate: data.poDate,
      vendor: data.vendorId,
      items: data.items.map((item) => ({
        ...item,
        balanceQuantity: item.quantity,
        receivedQuantity: 0,
      })),
      subtotal: data.subtotal,
      gstAmount: data.gstAmount || 0,
      totalValue: data.totalValue,
      paidAmount: 0,
      balanceAmount: data.totalValue,
      expectedDeliveryDate: data.expectedDeliveryDate || null,
      deliveryAddress: data.deliveryAddress || '',
      notes: data.notes || '',
      termsConditions: data.termsConditions || '',
      status: data.status || 'PENDING',
      createdBy: req.user.id,
      organization: organizationId,
    });

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('createdBy', 'name email');

    console.log(`✅ PO ${poNumber} created successfully`);

    res.status(201).json(populatedPO);
  } catch (error) {
    console.error('Error creating PO:', error);
    
    // ✅ Better error message for duplicate key
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Purchase Order number already exists. Please try again.' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ✅ Approve PO
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (po.status === 'APPROVED') {
      return res.status(400).json({ error: 'Purchase Order is already approved' });
    }

    if (po.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot approve a cancelled Purchase Order' });
    }

    // Update status to APPROVED
    po.status = 'APPROVED';
    po.approvedBy = req.user.id;
    po.approvedAt = new Date();

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error approving PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Cancel PO
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (po.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Purchase Order is already cancelled' });
    }

    // Check if any items have been received
    const hasReceived = po.items.some(item => item.receivedQuantity > 0);
    if (hasReceived) {
      return res.status(400).json({ 
        error: 'Cannot cancel Purchase Order with received items. Please create a return instead.' 
      });
    }

    po.status = 'CANCELLED';
    if (reason) {
      po.notes = (po.notes ? po.notes + '\n\n' : '') + `Cancelled: ${reason}`;
    }

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('createdBy', 'name email');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error cancelling PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update PO
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Prevent editing if already approved or has received items
    if (po.status === 'APPROVED' || po.status === 'RECEIVING') {
      const hasReceived = po.items.some(item => item.receivedQuantity > 0);
      if (hasReceived) {
        return res.status(400).json({ 
          error: 'Cannot edit Purchase Order with received items' 
        });
      }
    }

    // Update fields
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'status') {
        po[key] = data[key];
      }
    });

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error updating PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete PO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Prevent deletion if approved or has received items
    if (po.status === 'APPROVED' || po.status === 'RECEIVING') {
      return res.status(400).json({ 
        error: 'Cannot delete an approved Purchase Order. Please cancel it instead.' 
      });
    }

    const hasReceived = po.items.some(item => item.receivedQuantity > 0);
    if (hasReceived) {
      return res.status(400).json({ 
        error: 'Cannot delete Purchase Order with received items' 
      });
    }

    await po.deleteOne();

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record Payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMode, referenceNumber, notes } = req.body;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (amount > po.balanceAmount) {
      return res.status(400).json({ error: 'Payment amount exceeds balance' });
    }

    po.payments.push({
      amount,
      paymentDate,
      paymentMode,
      referenceNumber,
      notes,
      recordedBy: req.user.id,
    });

    po.paidAmount += amount;
    po.balanceAmount -= amount;

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('payments.recordedBy', 'name email');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update received quantities
router.patch('/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedItems, actualDeliveryDate } = req.body;
    const organizationId = req.user.organizationId;

    const po = await PurchaseOrder.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Update received quantities
    receivedItems.forEach((received) => {
      const item = po.items.id(received.itemId);
      if (item) {
        item.receivedQuantity = received.receivedQuantity;
      }
    });

    if (actualDeliveryDate) {
      po.actualDeliveryDate = actualDeliveryDate;
    }

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id).populate('vendor');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error updating received quantities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Link invoice to PO
router.post('/:id/link-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceId } = req.body;
    const organizationId = req.user.organizationId;

    const [po, invoice] = await Promise.all([
      PurchaseOrder.findOne({ _id: id, organization: organizationId }),
      Invoice.findOne({ _id: invoiceId, organization: organizationId }),
    ]);

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if already linked
    const alreadyLinked = po.linkedInvoices.some(
      (link) => link.invoice.toString() === invoiceId
    );

    if (alreadyLinked) {
      return res.status(400).json({ error: 'Invoice already linked' });
    }

    po.linkedInvoices.push({
      invoice: invoiceId,
      invoiceNumber: invoice.invoiceNumber,
    });

    await po.save();

    const updatedPO = await PurchaseOrder.findById(po._id)
      .populate('vendor')
      .populate('linkedInvoices.invoice');

    res.json(updatedPO);
  } catch (error) {
    console.error('Error linking invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get PO statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const stats = await PurchaseOrder.aggregate([
      { $match: { organization: organizationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          balanceAmount: { $sum: '$balanceAmount' },
        },
      },
    ]);

    const totalPOs = await PurchaseOrder.countDocuments({ organization: organizationId });
    const totalValue = await PurchaseOrder.aggregate([
      { $match: { organization: organizationId } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } },
    ]);

    res.json({
      stats,
      totalPOs,
      totalValue: totalValue[0]?.total || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;