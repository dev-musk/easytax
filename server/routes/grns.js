// ============================================
// FILE: server/routes/grns.js
// ✅ FEATURE #30: GRN/IGR - COMPLETE WITH STOCK UPDATES
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import GRN from '../models/GRN.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Product from '../models/Product.js';

const router = express.Router();
router.use(protect);

// ============================================
// STOCK UPDATE UTILITY
// ============================================
const updateStockFromGRN = async (grn, userId) => {
  try {
    console.log('📦 Updating stock from GRN:', grn.grnNumber);

    for (const item of grn.items) {
      // Find product by matching description and HSN
      const product = await Product.findOne({
        organization: grn.organization,
        $or: [
          { name: { $regex: new RegExp('^' + item.description + '$', 'i') } },
          { hsnSacCode: item.hsnSacCode }
        ],
        isActive: true
      });

      if (!product) {
        console.log(`⚠️ Product not found for: ${item.description}`);
        continue;
      }

      if (product.type === 'SERVICE' || !product.trackInventory) {
        console.log(`⏭️ Skipping ${item.description} - Service or inventory not tracked`);
        continue;
      }

      const previousStock = product.currentStock;
      const quantityToAdd = item.acceptedQuantity; // Only add accepted quantity

      // Update main stock
      product.currentStock += quantityToAdd;

      // Update location stock
      const location = grn.deliveryLocation || 'Main Warehouse';
      let locationStock = product.stockByLocation.find(
        (loc) => loc.locationName === location
      );

      if (!locationStock) {
        product.stockByLocation.push({
          locationName: location,
          quantity: quantityToAdd,
          minStockLevel: 0,
          maxStockLevel: 0,
          reorderLevel: 0,
        });
      } else {
        locationStock.quantity += quantityToAdd;
      }

      // Record stock movement
      product.stockMovements.push({
        type: 'PURCHASE',
        quantity: quantityToAdd,
        previousStock,
        newStock: product.currentStock,
        reference: `GRN: ${grn.grnNumber}`,
        referenceId: grn._id,
        location,
        notes: `Received from ${grn.vendor?.companyName || 'vendor'}`,
        performedBy: userId,
        performedAt: new Date(),
      });

      // Update last restocked
      product.lastRestockedDate = new Date();
      product.lastRestockedQuantity = quantityToAdd;

      await product.save();

      console.log(`✅ Stock updated for ${product.name}: ${previousStock} → ${product.currentStock}`);
    }

    console.log('✅ All stock updates completed');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    throw error;
  }
};

// ============================================
// UPDATE PO RECEIVED QUANTITIES
// ============================================
const updatePOReceivedQuantities = async (grn) => {
  try {
    const po = await PurchaseOrder.findById(grn.purchaseOrder);
    if (!po) {
      console.log('⚠️ Purchase Order not found');
      return;
    }

    // Update received quantities
    grn.items.forEach((grnItem) => {
      const poItem = po.items.id(grnItem.poItem);
      if (poItem) {
        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + grnItem.acceptedQuantity;
        poItem.balanceQuantity = poItem.quantity - poItem.receivedQuantity;
      }
    });

    // Update PO status
    const allReceived = po.items.every(item => item.receivedQuantity >= item.quantity);
    const someReceived = po.items.some(item => item.receivedQuantity > 0);

    if (allReceived) {
      po.status = 'RECEIVED';
    } else if (someReceived) {
      po.status = 'RECEIVING';
    }

    await po.save();
    console.log(`✅ PO ${po.poNumber} updated - Status: ${po.status}`);
  } catch (error) {
    console.error('❌ Error updating PO:', error);
    throw error;
  }
};

// ============================================
// ROUTES
// ============================================

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

// Get approved POs for GRN creation
router.get('/purchase-orders', async (req, res) => {
  try {
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

    // Validate
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
      status: 'RECEIVED', // Auto-set to RECEIVED
    });

    await grn.save();

    // ✅ UPDATE STOCK
    await updateStockFromGRN(grn, req.user.id);

    // ✅ UPDATE PO
    await updatePOReceivedQuantities(grn);

    // Populate and return
    const populatedGRN = await GRN.findById(grn._id)
      .populate('vendor', 'companyName email')
      .populate('purchaseOrder', 'poNumber')
      .populate('receivedBy', 'name email');

    console.log(`✅ GRN ${grnNumber} created successfully`);

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

    // Store old values for stock reversal if needed
    const oldItems = [...grn.items];

    // Update fields
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        grn[key] = req.body[key];
      }
    });

    await grn.save();

    // TODO: If items changed, adjust stock accordingly
    // For now, we're keeping it simple

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
    const grn = await GRN.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    // TODO: Reverse stock updates before deletion
    // For now, prevent deletion if status is not DRAFT
    if (grn.status !== 'DRAFT') {
      return res.status(400).json({ 
        error: 'Cannot delete GRN that has been processed. Please create a return note instead.' 
      });
    }

    await grn.deleteOne();

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