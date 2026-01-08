// ============================================
// FILE: server/routes/smartCategorization.js
// ✅ FEATURE #45: SMART CATEGORIZATION
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import CategoryMapping from '../models/CategoryMapping.js';

const router = express.Router();

router.use(protect);

// ============================================
// ✅ EXPENSE CATEGORIZATION RULES
// ============================================

const expenseCategories = {
  'Office Supplies': {
    keywords: ['paper', 'pen', 'stapler', 'folder', 'notebook', 'printer', 'ink', 'toner', 'envelope'],
    vendors: ['amazon', 'office depot', 'staples'],
  },
  'Travel': {
    keywords: ['flight', 'hotel', 'taxi', 'uber', 'ola', 'train', 'bus', 'travel', 'accommodation'],
    vendors: ['uber', 'ola', 'makemytrip', 'goibibo', 'irctc', 'airline'],
  },
  'Meals & Entertainment': {
    keywords: ['restaurant', 'food', 'dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'catering'],
    vendors: ['zomato', 'swiggy', 'dominos', 'mcdonald', 'starbucks'],
  },
  'Software & Subscriptions': {
    keywords: ['software', 'subscription', 'license', 'saas', 'cloud', 'hosting'],
    vendors: ['microsoft', 'google', 'aws', 'azure', 'adobe', 'github'],
  },
  'Utilities': {
    keywords: ['electricity', 'water', 'internet', 'phone', 'mobile', 'broadband', 'wifi'],
    vendors: ['airtel', 'jio', 'bsnl', 'tata', 'vodafone'],
  },
  'Marketing & Advertising': {
    keywords: ['ad', 'advertising', 'marketing', 'promotion', 'social media', 'seo', 'campaign'],
    vendors: ['google ads', 'facebook', 'instagram', 'linkedin'],
  },
  'Professional Services': {
    keywords: ['consultant', 'legal', 'accounting', 'audit', 'tax', 'lawyer', 'attorney'],
    vendors: [],
  },
  'Equipment & Machinery': {
    keywords: ['equipment', 'machinery', 'computer', 'laptop', 'hardware', 'tool', 'furniture'],
    vendors: [],
  },
  'Maintenance & Repairs': {
    keywords: ['repair', 'maintenance', 'service', 'fix', 'cleaning'],
    vendors: [],
  },
  'Rent': {
    keywords: ['rent', 'lease', 'rental'],
    vendors: [],
  },
};

// ============================================
// ✅ TAX CODE SUGGESTIONS
// ============================================

const taxCodeRules = {
  'Office Supplies': { gstRate: 18, tdsSection: null },
  'Travel': { gstRate: 5, tdsSection: null },
  'Meals & Entertainment': { gstRate: 5, tdsSection: null },
  'Software & Subscriptions': { gstRate: 18, tdsSection: '194J' },
  'Utilities': { gstRate: 18, tdsSection: null },
  'Marketing & Advertising': { gstRate: 18, tdsSection: '194C' },
  'Professional Services': { gstRate: 18, tdsSection: '194J' },
  'Equipment & Machinery': { gstRate: 18, tdsSection: null },
  'Maintenance & Repairs': { gstRate: 18, tdsSection: '194C' },
  'Rent': { gstRate: 18, tdsSection: '194I' },
};

// ============================================
// ✅ SUGGEST CATEGORY FOR INVOICE/EXPENSE
// ============================================

router.post('/suggest-category', async (req, res) => {
  try {
    const { description, vendorName, clientId, amount, items } = req.body;
    const organizationId = req.user.organizationId;

    if (!description && !vendorName && !items && !clientId) {
      return res.status(400).json({ error: 'Provide description, vendor, client ID, or items' });
    }

    // ✅ STEP 1: Check if we have a confirmed mapping for this client
    if (clientId) {
      const bestCategory = await CategoryMapping.getBestCategory(organizationId, clientId);
      if (bestCategory) {
        const taxCode = taxCodeRules[bestCategory];
        return res.json({
          suggestions: [{
            category: bestCategory,
            confidence: 95, // High confidence from confirmed mapping
            taxCode,
            source: 'confirmed_mapping',
          }],
          primarySuggestion: {
            category: bestCategory,
            confidence: 95,
            taxCode,
            source: 'confirmed_mapping',
          },
        });
      }
    }

    // ✅ STEP 2: Get historical mappings for this client
    let historicalBoost = {};
    if (clientId) {
      const clientMappings = await CategoryMapping.find({
        organization: organizationId,
        client: clientId,
      }).sort({ confidence: -1, usageCount: -1 }).limit(3);
      
      clientMappings.forEach(mapping => {
        historicalBoost[mapping.category] = mapping.confidence;
      });
    }

    // ✅ STEP 3: Keyword-based scoring (existing logic)
    const textToAnalyze = [
      description || '',
      vendorName || '',
      ...(items || []).map(item => `${item.description || ''} ${item.hsnSacCode || ''}`),
    ].join(' ').toLowerCase();

    const scores = {};
    Object.keys(expenseCategories).forEach(category => {
      scores[category] = 0;
      const rules = expenseCategories[category];

      // Check keywords
      rules.keywords.forEach(keyword => {
        if (textToAnalyze.includes(keyword)) {
          scores[category] += 10;
        }
      });

      // Check vendors
      rules.vendors.forEach(vendor => {
        if (textToAnalyze.includes(vendor)) {
          scores[category] += 20;
        }
      });
      
      // ✅ Apply historical boost
      if (historicalBoost[category]) {
        scores[category] += historicalBoost[category] / 2; // 50% weight to history
      }
    });

    // ✅ STEP 4: Get top suggestions
    const sortedCategories = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, score]) => ({
        category,
        confidence: Math.min(score / 50 * 100, 95),
        taxCode: taxCodeRules[category],
        source: historicalBoost[category] ? 'hybrid' : 'keyword',
      }));

    res.json({
      suggestions: sortedCategories.slice(0, 3),
      primarySuggestion: sortedCategories[0] || {
        category: 'Uncategorized',
        confidence: 0,
        taxCode: { gstRate: 18, tdsSection: null },
        source: 'default',
      },
    });
  } catch (error) {
    console.error('Category suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { clientId, category, description } = req.body;
    const organizationId = req.user.organizationId;

    if (!clientId || !category) {
      return res.status(400).json({ error: 'clientId and category required' });
    }

    // Extract keywords from description
    const keywords = description ? 
      description.toLowerCase().split(' ').filter(w => w.length > 3).slice(0, 5) : 
      [];

    await CategoryMapping.recordUsage(organizationId, clientId, category, keywords);

    res.json({ message: 'Category usage recorded', category });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ENHANCED: Learn from corrections
router.post('/learn', async (req, res) => {
  try {
    const { clientId, suggestedCategory, actualCategory } = req.body;
    const organizationId = req.user.organizationId;

    if (!clientId || !actualCategory) {
      return res.status(400).json({ error: 'clientId and actualCategory required' });
    }

    if (suggestedCategory && suggestedCategory !== actualCategory) {
      // User corrected the suggestion
      await CategoryMapping.learnFromCorrection(
        organizationId, 
        clientId, 
        suggestedCategory, 
        actualCategory
      );
      
      return res.json({ 
        message: 'Learning recorded - confidence adjusted',
        decreased: suggestedCategory,
        increased: actualCategory,
      });
    } else {
      // User confirmed the suggestion
      await CategoryMapping.recordUsage(organizationId, clientId, actualCategory);
      
      return res.json({ 
        message: 'Confirmation recorded - confidence increased',
        category: actualCategory,
      });
    }
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get all mappings for organization
router.get('/mappings', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    const mappings = await CategoryMapping.find({ organization: organizationId })
      .populate('client', 'companyName email')
      .sort({ confidence: -1, usageCount: -1 })
      .limit(100);
    
    res.json(mappings);
  } catch (error) {
    console.error('Mappings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ GET HISTORICAL PATTERN
// ============================================

async function getHistoricalPattern(organizationId, vendorName, description) {
  try {
    // Find similar past invoices
    const query = {
      organization: organizationId,
    };

    if (vendorName) {
      const client = await Client.findOne({
        organization: organizationId,
        companyName: new RegExp(vendorName, 'i'),
      });

      if (client) {
        query.client = client._id;
      }
    }

    // Get recent invoices (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    query.invoiceDate = { $gte: sixMonthsAgo };

    const recentInvoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(10);

    if (recentInvoices.length === 0) return null;

    // Analyze categories from notes/descriptions
    const categoryFrequency = {};

    recentInvoices.forEach(invoice => {
      const text = (invoice.notes || '').toLowerCase();

      Object.keys(expenseCategories).forEach(category => {
        if (text.includes(category.toLowerCase())) {
          categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;
        }
      });
    });

    // Return most frequent category
    const sortedCategories = Object.entries(categoryFrequency).sort(
      (a, b) => b[1] - a[1]
    );

    return sortedCategories[0]?.[0] || null;
  } catch (error) {
    console.error('Historical pattern error:', error);
    return null;
  }
}

// ============================================
// ✅ GET CATEGORY STATISTICS
// ============================================

router.get('/category-stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const filter = { organization: organizationId };

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter);

    // Categorize invoices
    const categoryStats = {};

    for (const invoice of invoices) {
      const text = [
        invoice.notes || '',
        ...(invoice.items || []).map(item => item.description),
      ].join(' ').toLowerCase();

      let categorized = false;

      Object.keys(expenseCategories).forEach(category => {
        const rules = expenseCategories[category];
        const matches = rules.keywords.some(keyword => text.includes(keyword));

        if (matches) {
          if (!categoryStats[category]) {
            categoryStats[category] = {
              count: 0,
              totalAmount: 0,
              avgAmount: 0,
            };
          }

          categoryStats[category].count++;
          categoryStats[category].totalAmount += invoice.totalAmount;
          categorized = true;
        }
      });

      if (!categorized) {
        if (!categoryStats['Uncategorized']) {
          categoryStats['Uncategorized'] = {
            count: 0,
            totalAmount: 0,
            avgAmount: 0,
          };
        }
        categoryStats['Uncategorized'].count++;
        categoryStats['Uncategorized'].totalAmount += invoice.totalAmount;
      }
    }

    // Calculate averages
    Object.keys(categoryStats).forEach(category => {
      categoryStats[category].avgAmount =
        categoryStats[category].totalAmount / categoryStats[category].count;
      categoryStats[category].totalAmount = parseFloat(
        categoryStats[category].totalAmount.toFixed(2)
      );
      categoryStats[category].avgAmount = parseFloat(
        categoryStats[category].avgAmount.toFixed(2)
      );
    });

    res.json({
      categories: categoryStats,
      totalInvoices: invoices.length,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ LEARN FROM USER CORRECTIONS
// ============================================

router.post('/learn', async (req, res) => {
  try {
    const { invoiceId, suggestedCategory, actualCategory } = req.body;
    const organizationId = req.user.organizationId;

    // In a real ML system, this would update the model
    // For now, we'll just log it for future enhancement

    console.log('Learning from correction:', {
      invoiceId,
      suggestedCategory,
      actualCategory,
      organizationId,
    });

    // Future: Store in a training dataset
    // Future: Retrain model periodically

    res.json({
      message: 'Learning recorded',
      note: 'ML model will improve with more data',
    });
  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ✅ BULK CATEGORIZE UNCATEGORIZED INVOICES
// ============================================

router.post('/bulk-categorize', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { dryRun = true } = req.body;

    // Find uncategorized invoices (no category in notes)
    const invoices = await Invoice.find({
      organization: organizationId,
      $or: [
        { notes: { $exists: false } },
        { notes: '' },
        { notes: null },
      ],
    }).limit(100); // Process 100 at a time

    const results = [];

    for (const invoice of invoices) {
      const text = [
        ...(invoice.items || []).map(item => item.description),
      ].join(' ').toLowerCase();

      let bestCategory = 'Uncategorized';
      let bestScore = 0;

      Object.keys(expenseCategories).forEach(category => {
        const rules = expenseCategories[category];
        let score = 0;

        rules.keywords.forEach(keyword => {
          if (text.includes(keyword)) score += 10;
        });

        if (score > bestScore) {
          bestScore = score;
          bestCategory = category;
        }
      });

      if (bestScore > 10) {
        results.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          suggestedCategory: bestCategory,
          confidence: Math.min(bestScore / 50 * 100, 95),
        });

        // Update invoice if not dry run
        if (!dryRun) {
          invoice.notes = `[Auto-categorized: ${bestCategory}] ${invoice.notes || ''}`;
          await invoice.save();
        }
      }
    }

    res.json({
      totalProcessed: invoices.length,
      categorized: results.length,
      dryRun,
      results: results.slice(0, 20), // Return first 20
      message: dryRun
        ? 'Dry run complete. Set dryRun=false to apply changes.'
        : `${results.length} invoices categorized successfully`,
    });
  } catch (error) {
    console.error('Bulk categorize error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;