// ============================================
// FILE: server/routes/ocr.js
// ✅ FEATURE #30: BASIC OCR & BARCODE SCANNING
// CREATE THIS NEW FILE
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js';

const router = express.Router();
router.use(protect);

// Configure multer for temp file storage
const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

// ✅ FEATURE #30: Barcode/SKU Lookup
router.get('/lookup', async (req, res) => {
  try {
    const { code } = req.query;
    const organizationId = req.user.organizationId;

    if (!code) {
      return res.status(400).json({ error: 'Barcode/SKU code required' });
    }

    // Search in product database
    const product = await Product.findOne({
      organization: organizationId,
      $or: [
        { hsnSacCode: code.trim() },
        { hsnSacCode: { $regex: code.trim(), $options: 'i' } },
        { name: { $regex: code.trim(), $options: 'i' } },
      ],
      isActive: true,
    });

    if (product) {
      return res.json({
        found: true,
        product: {
          _id: product._id,
          name: product.name,
          description: product.description,
          hsnSacCode: product.hsnSacCode,
          rate: product.rate,
          gstRate: product.gstRate,
          unit: product.unit,
          type: product.type,
        },
      });
    }

    // Not found
    res.json({
      found: false,
      message: `No product found with code: ${code}`,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #30: Basic OCR (without Tesseract for now)
router.post('/scan-document', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // For now, return a message about OCR capability
    // In production, you would use Tesseract.js or Google Vision API here
    
    const response = {
      success: true,
      message: 'File uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size,
      note: 'OCR processing requires additional setup. For now, please enter data manually.',
      instructions: [
        '1. Install Tesseract OCR: npm install tesseract.js',
        '2. Or integrate Google Vision API for better accuracy',
        '3. Update this route to process the uploaded file',
      ],
    };

    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('Cleanup error:', err);
    }

    res.json(response);
  } catch (error) {
    console.error('Scan error:', error);
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #30: Barcode generation helper
router.post('/generate-barcode', async (req, res) => {
  try {
    const { productId } = req.body;
    const organizationId = req.user.organizationId;

    const product = await Product.findOne({
      _id: productId,
      organization: organizationId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate a simple barcode based on HSN + product ID
    const barcode = product.hsnSacCode 
      ? `${product.hsnSacCode}-${product._id.toString().slice(-6)}`
      : product._id.toString();

    res.json({
      barcode,
      product: {
        _id: product._id,
        name: product.name,
        hsnSacCode: product.hsnSacCode,
      },
    });
  } catch (error) {
    console.error('Barcode generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;