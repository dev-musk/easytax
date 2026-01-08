// ============================================
// FILE: server/routes/grns.js
// ✅ FEATURE #46: GRN CRUD Operations - FIXED
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import GRN from '../models/GRN.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';

const router = express.Router();
router.use(protect);

// Get all GRNs
router.get('/', async (req, res) => {
  try {
    const grns = await GRN.find({ organization: req.user.organizationId })
      .populate('vendor', 'companyName email')
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW ROUTE: Get Purchase Orders for GRN creation
router.get('/purchase-orders', async (req, res) => {
  try {
    // Get approved POs that are ready for receiving
    const pos = await PurchaseOrder.find({
      organization: req.user.organizationId,
      status: { $in: ['APPROVED', 'RECEIVING'] }
    })
      .populate('vendor', 'companyName email gstin')
      .sort({ createdAt: -1 });

    res.json(pos);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single GRN
router.get('/:id', async (req, res) => {
  try {
    const grn = await GRN.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    })
      .populate('vendor', 'companyName email gstin')
      .populate('purchaseOrder')
      .populate('receivedBy', 'name email')
      .populate('linkedInvoice');

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    res.json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create GRN
router.post('/', async (req, res) => {
  try {
    const {
      purchaseOrderId,
      deliveryDate,
      deliveryLocation,
      items,
      notes,
    } = req.body;

    // Validate required fields
    if (!purchaseOrderId) {
      return res.status(400).json({ error: 'Purchase Order is required' });
    }

    if (!deliveryDate) {
      return res.status(400).json({ error: 'Delivery Date is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Fetch PO
    const po = await PurchaseOrder.findOne({
      _id: purchaseOrderId,
      organization: req.user.organizationId,
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Generate GRN Number
    const count = await GRN.countDocuments({
      organization: req.user.organizationId,
    });
    const grnNumber = `GRN-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Create GRN
    const grn = new GRN({
      grnNumber,
      grnDate: new Date(),
      purchaseOrder: po._id,
      poNumber: po.poNumber,
      vendor: po.vendor,
      deliveryDate,
      deliveryLocation: deliveryLocation || 'Main Warehouse',
      receivedBy: req.user.id,
      items: items.map((item) => ({
        ...item,
        poItem: item.poItemId,
      })),
      totalAmount,
      organization: req.user.organizationId,
      notes,
    });

    await grn.save();

    // Update PO status
    if (po.status === 'APPROVED') {
      po.status = 'RECEIVING';
      await po.save();
    }

    // Populate and return
    const populatedGRN = await GRN.findById(grn._id)
      .populate('vendor', 'companyName email')
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name email');

    res.status(201).json(populatedGRN);
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update GRN
router.put('/:id', async (req, res) => {
  try {
    const grn = await GRN.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        grn[key] = req.body[key];
      }
    });

    await grn.save();

    const updatedGRN = await GRN.findById(grn._id)
      .populate('vendor', 'companyName email')
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name email');

    res.json(updatedGRN);
  } catch (error) {
    console.error('Error updating GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete GRN
router.delete('/:id', async (req, res) => {
  try {
    const grn = await GRN.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    res.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update inspection status
router.patch('/:id/inspect', async (req, res) => {
  try {
    const { itemId, qualityStatus, remarks } = req.body;

    const grn = await GRN.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    const item = grn.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found in GRN' });
    }

    item.qualityStatus = qualityStatus;
    item.remarks = remarks;
    item.inspectedBy = req.user.id;
    item.inspectionDate = new Date();

    await grn.save();

    const updatedGRN = await GRN.findById(grn._id)
      .populate('vendor', 'companyName email')
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name email');

    res.json(updatedGRN);
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;