// ============================================
// FILE: server/routes/hsn.js
// HSN/SAC Code Management Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import HSNCode from '../models/HSNCode.js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ✅ FEATURE #6: Import HSN codes from CSV
router.post('/import', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const filePath = req.file.path;
    
    console.log('📥 Starting HSN import from:', req.file.originalname);

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv({
        // Handle different CSV formats from GST portal
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      }))
      .on('data', (row) => {
        // GST Portal CSV typically has: HSN Code, Description, GST Rate
        // Handle various column name formats
        const code = (
          row.hsn_code || 
          row.hsn || 
          row.code || 
          row['hsn/sac_code'] ||
          row['hsn/sac'] ||
          ''
        ).toString().trim();
        
        const description = (
          row.description || 
          row.item_description ||
          row.commodity ||
          row.goods_description ||
          ''
        ).trim();
        
        const gstRate = parseFloat(
          row.gst_rate || 
          row.rate || 
          row.tax_rate ||
          18
        );
        
        // Determine type based on code or description
        let type = 'GOODS';
        if (code.length === 6 && parseInt(code.substring(0, 2)) >= 99) {
          type = 'SERVICES'; // SAC codes typically start with 99
        }
        if (description.toLowerCase().includes('service')) {
          type = 'SERVICES';
        }

        if (code && description) {
          results.push({
            code: code.replace(/\s/g, ''), // Remove spaces
            description: description,
            type: type,
            defaultGstRate: gstRate,
            gstRates: [gstRate],
            isActive: true,
          });
        }
      })
      .on('end', async () => {
        try {
          console.log(`📊 Parsed ${results.length} HSN codes from CSV`);

          if (results.length === 0) {
            // Delete temp file
            fs.unlinkSync(filePath);
            return res.status(400).json({
              error: 'No valid HSN codes found in CSV file',
              hint: 'CSV should have columns: HSN Code, Description, GST Rate (optional)',
            });
          }

          // Batch insert with upsert to avoid duplicates
          const bulkOps = results.map(hsn => ({
            updateOne: {
              filter: { code: hsn.code },
              update: { $set: hsn },
              upsert: true,
            },
          }));

          const result = await HSNCode.bulkWrite(bulkOps);

          // Delete temp file
          fs.unlinkSync(filePath);

          console.log('✅ HSN import completed successfully');

          res.json({
            message: 'HSN codes imported successfully',
            stats: {
              total: results.length,
              inserted: result.upsertedCount,
              updated: result.modifiedCount,
              matched: result.matchedCount,
            },
          });
        } catch (error) {
          // Delete temp file on error
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          console.error('❌ Error inserting HSN codes:', error);
          res.status(500).json({ error: error.message });
        }
      })
      .on('error', (error) => {
        // Delete temp file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error('❌ Error parsing CSV:', error);
        res.status(500).json({ error: 'Failed to parse CSV file: ' + error.message });
      });

  } catch (error) {
    console.error('❌ Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #6: Search HSN codes
router.get('/search', protect, async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      // Return popular HSN codes if no query
      const popular = await HSNCode.getPopular(parseInt(limit));
      return res.json(popular);
    }

    // Build search query
    const query = q.trim();
    const searchRegex = new RegExp(query, 'i');

    const filter = {
      $or: [
        { code: searchRegex },
        { description: searchRegex },
        { keywords: { $in: [searchRegex] } },
      ],
      isActive: true,
    };

    // Filter by type if specified
    if (type && (type === 'GOODS' || type === 'SERVICES')) {
      filter.type = type;
    }

    const results = await HSNCode.find(filter)
      .sort({ usageCount: -1, code: 1 })
      .limit(parseInt(limit))
      .select('code description type defaultGstRate gstRates usageCount');

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FIXED: Specific routes BEFORE parameterized routes

// Get popular HSN codes
router.get('/popular', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popular = await HSNCode.getPopular(parseInt(limit));
    
    res.json(popular);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get HSN statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await HSNCode.aggregate([
      {
        $group: {
          _id: null,
          totalCodes: { $sum: 1 },
          totalGoods: {
            $sum: { $cond: [{ $eq: ['$type', 'GOODS'] }, 1, 0] }
          },
          totalServices: {
            $sum: { $cond: [{ $eq: ['$type', 'SERVICES'] }, 1, 0] }
          },
          totalUsage: { $sum: '$usageCount' },
        }
      }
    ]);

    const mostUsed = await HSNCode.find({ usageCount: { $gt: 0 } })
      .sort({ usageCount: -1 })
      .limit(10)
      .select('code description usageCount');

    res.json({
      overview: stats[0] || {
        totalCodes: 0,
        totalGoods: 0,
        totalServices: 0,
        totalUsage: 0,
      },
      mostUsed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get HSN code details by code (AFTER specific routes)
router.get('/:code', protect, async (req, res) => {
  try {
    const { code } = req.params;
    
    const hsnCode = await HSNCode.findOne({ code: code.toUpperCase() });
    
    if (!hsnCode) {
      return res.status(404).json({ error: 'HSN code not found' });
    }
    
    res.json(hsnCode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk add custom HSN codes (for manual entry)
router.post('/bulk', protect, async (req, res) => {
  try {
    const { codes } = req.body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Codes array is required' });
    }

    const bulkOps = codes.map(hsn => ({
      updateOne: {
        filter: { code: hsn.code },
        update: { $set: hsn },
        upsert: true,
      },
    }));

    const result = await HSNCode.bulkWrite(bulkOps);

    res.json({
      message: 'HSN codes added successfully',
      stats: {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all HSN codes (admin only)
router.delete('/all', protect, async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== 'DELETE_ALL_HSN_CODES') {
      return res.status(400).json({
        error: 'Confirmation required',
        hint: 'Add query parameter: ?confirm=DELETE_ALL_HSN_CODES',
      });
    }

    const result = await HSNCode.deleteMany({});

    res.json({
      message: 'All HSN codes deleted',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;