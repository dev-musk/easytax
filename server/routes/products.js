// ============================================
// FILE: server/routes/products.js
// NEW FILE - Product/Service Master Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Product from '../models/Product.js';

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

// Delete product (soft delete - set isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanent delete
      const product = await Product.findOneAndDelete({
        _id: id,
        organization: organizationId,
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted permanently' });
    } else {
      // Soft delete - set isActive to false
      const product = await Product.findOneAndUpdate(
        { _id: id, organization: organizationId },
        { isActive: false },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deactivated successfully', product });
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