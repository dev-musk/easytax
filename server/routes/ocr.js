import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Product from '../models/Product.js';
import { extractTextFromImage } from '../services/ocrService.js';

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
// ✅ Document Scanning with Real OCR
// ============================================
router.post('/scan-document', upload.single('image'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    tempFilePath = req.file.path;
    console.log(`📄 Processing document: ${req.file.originalname}`);
    console.log(`📂 File path: ${tempFilePath}`);

    // Call the real OCR service
    const extractedData = await extractTextFromImage(tempFilePath);

    console.log('✅ OCR extraction completed:', {
      vendorName: extractedData.vendorName,
      totalAmount: extractedData.totalAmount,
      itemsCount: extractedData.items?.length || 0,
      confidence: extractedData.confidence,
    });

    // Map extracted data to response format
    const responseData = {
      vendorName: extractedData.vendorName || 'Not found',
      totalAmount: extractedData.totalAmount || 0,
      amount: extractedData.totalAmount || 0, // Alias for compatibility
      date: extractedData.date || new Date().toISOString().split('T')[0],
      hsn: extractedData.hsn || '',
      gstRate: extractedData.gstRate || 18,
      description: extractedData.items?.[0]?.description || 'Scanned item',
      invoiceNumber: extractedData.invoiceNumber || '',
      gstin: extractedData.gstin || '',
      poNumber: extractedData.poNumber || '',
      dueDate: extractedData.dueDate || '',
      confidence: extractedData.confidence || 0,
      parsingConfidence: extractedData.parsingConfidence || 0,
      rawText: extractedData.rawText?.substring(0, 1000) || '',
      // ✅ IMPORTANT: Map all extracted items
      items: (extractedData.items || []).map(item => ({
        sno: item.sno,
        description: item.description,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
      })),
    };

    // Schedule temp file cleanup
    scheduleCleanup(tempFilePath);

    res.json({
      success: true,
      message: 'Document scanned successfully',
      data: responseData,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

  } catch (error) {
    console.error('❌ OCR Scan error:', error.message);

    // Immediate cleanup on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Temp file deleted on error');
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed',
    });
  }
});

// ============================================
// ✅ Barcode/SKU Lookup
// ============================================
router.get('/lookup', async (req, res) => {
  try {
    const { code } = req.query;
    const organizationId = req.user.organizationId;

    if (!code || !code.trim()) {
      return res.status(400).json({
        error: 'Barcode/SKU code required',
        found: false,
      });
    }

    const trimmedCode = code.trim();
    console.log(`🔍 Looking up barcode: ${trimmedCode}`);

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

    // Not found
    console.log(`❌ No match for: ${trimmedCode}`);

    const alternatives = await Product.find({
      organization: organizationId,
      hsnSacCode: { $regex: trimmedCode.substring(0, 3), $options: 'i' },
      isActive: true,
    }).limit(5);

    res.json({
      found: false,
      message: `No product found with code: ${trimmedCode}`,
      suggestions: alternatives.map(formatProductResponse),
    });
  } catch (error) {
    console.error('❌ Lookup error:', error);
    res.status(500).json({ error: error.message, found: false });
  }
});

// ============================================
// ✅ Helper Functions
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

function scheduleCleanup(filePath) {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Temp file cleaned: ${path.basename(filePath)}`);
      }
    } catch (err) {
      console.error('Delayed cleanup error:', err);
    }
  }, 5000); // 5 seconds
}

export default router;