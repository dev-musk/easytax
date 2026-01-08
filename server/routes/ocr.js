// ============================================
// FILE: server/routes/ocr.js
// ✅ FEATURE #30: COMPLETE OCR/BARCODE ROUTES
// ENHANCED VERSION WITH LOGGING & ERROR HANDLING
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js';

const router = express.Router();
router.use(protect);

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

// ============================================
// ✅ FEATURE #30: Barcode/SKU Lookup
// ============================================
router.get('/lookup', async (req, res) => {
  try {
    const { code } = req.query;
    const organizationId = req.user.organizationId;

    // Validation
    if (!code || !code.trim()) {
      return res.status(400).json({
        error: 'Barcode/SKU code required',
        found: false,
      });
    }

    const trimmedCode = code.trim();

    console.log(`🔍 Looking up barcode: ${trimmedCode}`);

    // Search strategies (in order of priority)
    let product = null;

    // Strategy 1: Exact HSN/SAC match
    product = await Product.findOne({
      organization: organizationId,
      hsnSacCode: trimmedCode,
      isActive: true,
    });

    if (product) {
      console.log(`✅ Found by HSN/SAC: ${product.name}`);
      return res.json({
        found: true,
        matchType: 'hsnSacCode',
        product: formatProductResponse(product),
      });
    }

    // Strategy 2: Case-insensitive HSN/SAC match
    product = await Product.findOne({
      organization: organizationId,
      hsnSacCode: { $regex: `^${trimmedCode}$`, $options: 'i' },
      isActive: true,
    });

    if (product) {
      console.log(`✅ Found by HSN/SAC (case-insensitive): ${product.name}`);
      return res.json({
        found: true,
        matchType: 'hsnSacCode_caseInsensitive',
        product: formatProductResponse(product),
      });
    }

    // Strategy 3: Product name match
    product = await Product.findOne({
      organization: organizationId,
      name: { $regex: trimmedCode, $options: 'i' },
      isActive: true,
    });

    if (product) {
      console.log(`✅ Found by product name: ${product.name}`);
      return res.json({
        found: true,
        matchType: 'productName',
        product: formatProductResponse(product),
      });
    }

    // Strategy 4: Text search (uses indexes)
    product = await Product.findOne({
      organization: organizationId,
      $text: { $search: trimmedCode },
      isActive: true,
    });

    if (product) {
      console.log(`✅ Found by text search: ${product.name}`);
      return res.json({
        found: true,
        matchType: 'textSearch',
        product: formatProductResponse(product),
      });
    }

    // Not found - return alternatives
    console.log(`❌ No exact match for: ${trimmedCode}`);

    const alternatives = await Product.find({
      organization: organizationId,
      hsnSacCode: { $regex: trimmedCode.substring(0, 3), $options: 'i' },
      isActive: true,
    }).limit(5);

    res.json({
      found: false,
      message: `No product found with code: ${trimmedCode}`,
      suggestions: alternatives.map(formatProductResponse),
      tip: 'Check the barcode format or try entering the product name',
    });
  } catch (error) {
    console.error('❌ Lookup error:', error);
    res.status(500).json({ error: error.message, found: false });
  }
});

// ============================================
// ✅ FEATURE #30: Advanced Lookup with Confidence
// ============================================
router.post('/lookup-advanced', async (req, res) => {
  try {
    const { code, productName, vendorName } = req.body;
    const organizationId = req.user.organizationId;

    if (!code && !productName) {
      return res.status(400).json({
        error: 'Either code or productName required',
      });
    }

    const query = {
      organization: organizationId,
      isActive: true,
    };

    let searchCriteria = [];

    // Build search criteria with confidence scores
    if (code) {
      searchCriteria.push({
        hsnSacCode: { $regex: code, $options: 'i' },
        confidence: 0.95,
      });
    }

    if (productName) {
      searchCriteria.push({
        name: { $regex: productName, $options: 'i' },
        confidence: 0.85,
      });
    }

    const products = await Product.find({
      ...query,
      $or: searchCriteria.map((c) => ({
        hsnSacCode: c.hsnSacCode,
      })),
    }).limit(10);

    if (products.length === 0) {
      return res.json({
        found: false,
        message: 'No products found',
        suggestions: [],
      });
    }

    const results = products.map((p) => ({
      ...formatProductResponse(p),
      confidence:
        code && p.hsnSacCode === code
          ? 0.99
          : productName && p.name.toLowerCase().includes(productName.toLowerCase())
          ? 0.85
          : 0.7,
    }));

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    res.json({
      found: results.length > 0,
      topMatch: results[0],
      alternatives: results.slice(1),
    });
  } catch (error) {
    console.error('Advanced lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #30: Document Scanning Preparation
// ============================================
router.post('/scan-document', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 Document uploaded: ${req.file.originalname}`);

    // File details
    const response = {
      success: true,
      message:
        'File received. OCR processing requires additional API integration.',
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date(),
      },
      nextSteps: [
        {
          step: 1,
          title: 'Option A: Tesseract.js (Free, Client-side)',
          command: 'npm install tesseract.js',
          cost: 'Free',
          accuracy: '~85%',
        },
        {
          step: 2,
          title: 'Option B: Google Cloud Vision (Paid, Server-side)',
          command: 'npm install @google-cloud/vision',
          cost: '$1.50-5 per 1000 requests',
          accuracy: '~95%',
        },
        {
          step: 3,
          title: 'Option C: AWS Textract (Paid, Server-side)',
          command: 'npm install aws-sdk',
          cost: '$0.015-0.10 per page',
          accuracy: '~92%',
        },
      ],
    };

    // Clean up temp file after 1 hour
    setTimeout(() => {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`🗑️ Temp file cleaned: ${req.file.originalname}`);
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }, 60 * 60 * 1000); // 1 hour

    res.json(response);
  } catch (error) {
    console.error('❌ Scan error:', error);

    // Cleanup on error
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

// ============================================
// ✅ FEATURE #30: Generate Barcode for Product
// ============================================
router.post('/generate-barcode', async (req, res) => {
  try {
    const { productId } = req.body;
    const organizationId = req.user.organizationId;

    if (!productId) {
      return res.status(400).json({ error: 'productId required' });
    }

    const product = await Product.findOne({
      _id: productId,
      organization: organizationId,
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate unique barcode
    const barcode = product.hsnSacCode
      ? `${product.hsnSacCode}-${product._id.toString().slice(-6)}`
      : `${product._id.toString().slice(-8)}`;

    console.log(`📦 Barcode generated for ${product.name}: ${barcode}`);

    res.json({
      success: true,
      barcode,
      product: {
        _id: product._id,
        name: product.name,
        hsnSacCode: product.hsnSacCode,
      },
      note: 'Use this barcode code to print labels for the product',
    });
  } catch (error) {
    console.error('❌ Barcode generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #30: Search Products by HSN
// ============================================
router.get('/search-hsn', async (req, res) => {
  try {
    const { hsn, limit = 10 } = req.query;
    const organizationId = req.user.organizationId;

    if (!hsn) {
      return res.status(400).json({ error: 'HSN code required' });
    }

    const products = await Product.find({
      organization: organizationId,
      hsnSacCode: { $regex: hsn, $options: 'i' },
      isActive: true,
    })
      .limit(parseInt(limit))
      .select('name hsnSacCode rate gstRate unit type');

    res.json({
      found: products.length > 0,
      count: products.length,
      products: products.map(formatProductResponse),
    });
  } catch (error) {
    console.error('❌ HSN search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ FEATURE #30: Batch Barcode Lookup
// ============================================
router.post('/batch-lookup', async (req, res) => {
  try {
    const { codes } = req.body;
    const organizationId = req.user.organizationId;

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Array of codes required' });
    }

    console.log(`🔍 Batch lookup for ${codes.length} codes`);

    const results = await Promise.all(
      codes.map(async (code) => {
        const product = await Product.findOne({
          organization: organizationId,
          $or: [
            { hsnSacCode: code.trim() },
            { hsnSacCode: { $regex: code.trim(), $options: 'i' } },
          ],
          isActive: true,
        });

        return {
          code,
          found: !!product,
          product: product ? formatProductResponse(product) : null,
        };
      })
    );

    const successful = results.filter((r) => r.found).length;
    console.log(`✅ Batch lookup complete: ${successful}/${codes.length} found`);

    res.json({
      total: codes.length,
      found: successful,
      notFound: codes.length - successful,
      results,
    });
  } catch (error) {
    console.error('❌ Batch lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ Helper: Format Product Response
// ============================================
function formatProductResponse(product) {
  return {
    _id: product._id,
    name: product.name,
    description: product.description || '',
    hsnSacCode: product.hsnSacCode || '',
    rate: product.rate,
    gstRate: product.gstRate,
    unit: product.unit,
    type: product.type,
    currentStock: product.type === 'PRODUCT' ? product.currentStock : null,
    trackInventory: product.type === 'PRODUCT' ? product.trackInventory : null,
  };
}

export default router;