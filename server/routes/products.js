// ============================================
// FILE: server/routes/products.js
// ✅ FEATURE #15: Lock Previously Billed Items
// ✅ FEATURE #23: Central Item Master Enforcement
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Product from '../models/Product.js';
import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Quotation from '../models/Quotation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get all products
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { search, type, isActive } = req.query;

    const filter = { organization: organizationId };

    // Filter by type
    if (type && type !== 'ALL') {
      filter.type = type;
    }

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    let products;

    // Search by name, HSN/SAC, or description
    if (search) {
      products = await Product.find({
        ...filter,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { hsnSacCode: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ],
      }).sort({ createdAt: -1 });
    } else {
      products = await Product.find(filter).sort({ createdAt: -1 });
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const product = await Product.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const productData = {
      ...req.body,
      organization: organizationId,
    };

    const product = await Product.create(productData);

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const product = await Product.findOneAndUpdate(
      { _id: id, organization: organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #15: Check if product is used in documents
// ============================================
const checkProductUsage = async (productId, organizationId) => {
  try {
    // Check Invoices
    const invoiceUsage = await Invoice.countDocuments({
      organization: organizationId,
      'items.product': productId,
      status: { $nin: ['DRAFT', 'CANCELLED'] },
    });

    // Check Quotations
    const quotationUsage = await Quotation.countDocuments({
      organization: organizationId,
      'items.product': productId,
      status: { $nin: ['DRAFT', 'EXPIRED'] },
    });

    // Note: PO usage check removed until PO model has product refs

    return {
      isUsed: invoiceUsage > 0 || quotationUsage > 0,
      invoiceCount: invoiceUsage,
      quotationCount: quotationUsage,
      totalUsage: invoiceUsage + quotationUsage,
      usageDetails: {
        invoices: invoiceUsage > 0,
        quotations: quotationUsage > 0,
      },
    };
  } catch (error) {
    console.error('Error checking product usage:', error);
    return {
      isUsed: false,
      invoiceCount: 0,
      quotationCount: 0,
      totalUsage: 0,
      error: error.message,
    };
  }
};

// ============================================
// ✅ FEATURE #15: Get product usage details
// ============================================
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const product = await Product.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const usage = await checkProductUsage(id, organizationId);

    res.json({
      productId: id,
      productName: product.name,
      ...usage,
      message: usage.isUsed
        ? `This item has been used in ${usage.totalUsage} document(s) and cannot be deleted.`
        : 'This item can be safely deleted.',
    });
  } catch (error) {
    console.error('Error checking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #15: Delete product with checks
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { permanent } = req.query;

    const product = await Product.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // ✅ FEATURE #15: Check if product has been used in invoices/quotations
    const usage = await checkProductUsage(id, organizationId);

    if (usage.isUsed && permanent !== 'true') {
      // ✅ If used, only allow deactivation (soft delete)
      console.log(
        `⛔ Attempted to delete product "${product.name}" used in ${usage.totalUsage} document(s)`
      );

      return res.status(400).json({
        error: 'CANNOT_DELETE_BILLED_ITEM',
        message: `This item cannot be deleted because it has been used in ${usage.totalUsage} document(s):
         - Invoices: ${usage.invoiceCount}
         - Quotations: ${usage.quotationCount}
         
         For audit trail purposes, items used in transactions are locked and cannot be deleted. 
         You can only deactivate them.`,
        details: usage,
        suggestion: 'Deactivate this item instead to keep the audit trail intact.',
      });
    }

    if (permanent === 'true') {
      // ⚠️ Only allow permanent delete if NEVER used
      if (usage.isUsed) {
        return res.status(403).json({
          error: 'CANNOT_PERMANENTLY_DELETE_BILLED_ITEM',
          message: `Cannot permanently delete this item as it has been used in transactions. 
           This is protected for audit compliance.`,
          details: usage,
        });
      }

      // Permanent delete (only for unused items)
      const deleted = await Product.findOneAndDelete({
        _id: id,
        organization: organizationId,
      });

      console.log(`🗑️ Permanently deleted product: ${deleted.name}`);

      return res.json({
        message: 'Product permanently deleted',
        product: deleted,
      });
    } else {
      // Soft delete - set isActive to false
      const updated = await Product.findOneAndUpdate(
        { _id: id, organization: organizationId },
        { isActive: false },
        { new: true }
      );

      console.log(`📦 Deactivated product: ${updated.name}`);

      return res.json({
        message: 'Product deactivated successfully',
        product: updated,
        note: usage.isUsed
          ? `This item was used in ${usage.totalUsage} document(s) and has been deactivated.`
          : 'Product deactivated successfully.',
      });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore deactivated product
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const product = await Product.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { isActive: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product restored successfully', product });
  } catch (error) {
    console.error('Error restoring product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product categories (unique list)
router.get('/meta/categories', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const categories = await Product.distinct('category', {
      organization: organizationId,
      category: { $ne: '' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;