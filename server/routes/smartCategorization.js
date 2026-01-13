// Server route file content from document 1
import express from 'express';
import { protect } from '../middleware/auth.js';
import CategoryMapping from '../models/CategoryMapping.js';

const router = express.Router();
router.use(protect);

const CATEGORY_PATTERNS = {
  'Office Supplies': {
    keywords: ['office', 'supplies', 'stationery', 'pen', 'pencil', 'paper', 'notebook', 'folder', 'file', 'stapler', 'clip', 'tape', 'glue', 'scissors', 'ruler', 'marker', 'highlighter', 'eraser', 'whiteboard', 'board', 'desk', 'organizer'],
    gstRate: 18,
    hsnCode: '4820',
  },
  'Furniture': {
    keywords: ['furniture', 'chair', 'table', 'desk', 'cabinet', 'shelf', 'rack', 'sofa', 'couch', 'stool', 'bench', 'cupboard', 'drawer', 'wardrobe', 'bookshelf', 'filing cabinet', 'workspace', 'workstation'],
    gstRate: 18,
    hsnCode: '9403',
  },
  'IT Equipment': {
    keywords: ['laptop', 'computer', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'hard drive', 'ssd', 'ram', 'motherboard', 'cpu', 'gpu', 'server', 'router', 'modem', 'switch', 'cable', 'usb', 'hdmi', 'webcam', 'microphone', 'speaker', 'headphone', 'headset'],
    gstRate: 18,
    hsnCode: '8471',
  },
  'Software & Licenses': {
    keywords: ['software', 'license', 'subscription', 'saas', 'cloud', 'microsoft', 'office 365', 'adobe', 'antivirus', 'windows', 'operating system', 'crm', 'erp', 'accounting software', 'zoom', 'slack', 'dropbox'],
    gstRate: 18,
    hsnCode: '9983',
  },
  'Travel & Conveyance': {
    keywords: ['travel', 'flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'cab', 'hotel', 'accommodation', 'lodging', 'airfare', 'ticket', 'booking', 'fuel', 'petrol', 'diesel', 'toll', 'parking', 'conveyance'],
    gstRate: 5,
    hsnCode: '9964',
  },
  'Utilities': {
    keywords: ['electricity', 'water', 'gas', 'utility', 'power', 'electric bill', 'water bill', 'maintenance', 'housekeeping', 'cleaning', 'security'],
    gstRate: 18,
    hsnCode: '9985',
  },
  'Telecommunications': {
    keywords: ['mobile', 'phone', 'telephone', 'internet', 'broadband', 'wifi', 'data plan', 'airtel', 'jio', 'vodafone', 'bsnl', 'telecom', 'postpaid', 'prepaid', 'recharge'],
    gstRate: 18,
    hsnCode: '9971',
  },
  'Professional Fees': {
    keywords: ['consultant', 'consulting', 'professional', 'legal', 'lawyer', 'attorney', 'chartered accountant', 'ca', 'audit', 'advisory', 'expert', 'service fee', 'retainer', 'professional service'],
    gstRate: 18,
    hsnCode: '9983',
    tdsSection: '194J',
  },
  'Advertising & Marketing': {
    keywords: ['advertising', 'marketing', 'promotion', 'seo', 'google ads', 'facebook ads', 'social media', 'banner', 'billboard', 'flyer', 'brochure', 'campaign', 'branding', 'graphic design', 'website design', 'digital marketing'],
    gstRate: 18,
    hsnCode: '9983',
  },
  'Rent': {
    keywords: ['rent', 'lease', 'rental', 'office rent', 'shop rent', 'warehouse rent', 'property rent', 'tenancy', 'monthly rent'],
    gstRate: 18,
    hsnCode: '9972',
    tdsSection: '194I',
  },
  'Printing & Stationery': {
    keywords: ['printing', 'print', 'photocopy', 'xerox', 'binding', 'lamination', 'business card', 'letterhead', 'invoice book', 'receipt book', 'stamp'],
    gstRate: 18,
    hsnCode: '4901',
  },
  'Repairs & Maintenance': {
    keywords: ['repair', 'maintenance', 'servicing', 'fix', 'fixing', 'replacement', 'spare parts', 'amc', 'annual maintenance', 'breakdown'],
    gstRate: 18,
    hsnCode: '9987',
  },
  'Insurance': {
    keywords: ['insurance', 'premium', 'policy', 'health insurance', 'life insurance', 'vehicle insurance', 'property insurance', 'liability insurance'],
    gstRate: 18,
    hsnCode: '9972',
  },
  'Food & Beverages': {
    keywords: ['food', 'beverage', 'meal', 'lunch', 'dinner', 'breakfast', 'snack', 'tea', 'coffee', 'water', 'juice', 'restaurant', 'catering', 'pantry', 'canteen', 'refreshment'],
    gstRate: 5,
    hsnCode: '9963',
  },
  'Bank Charges': {
    keywords: ['bank charge', 'bank fee', 'transaction charge', 'processing fee', 'service charge', 'atm', 'debit card', 'credit card', 'annual fee'],
    gstRate: 18,
    hsnCode: '9971',
  },
};

function findBestCategory(description, vendorName = '', amount = 0) {
  const searchText = `${description} ${vendorName}`.toLowerCase();
  const matches = [];

  for (const [category, data] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    const matchedKeywords = [];

    for (const keyword of data.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 1) {
      score += matchedKeywords.length * 5;
    }

    if (searchText.includes(category.toLowerCase())) {
      score += 20;
    }

    if (score > 0) {
      matches.push({
        category,
        score,
        matchedKeywords,
        gstRate: data.gstRate,
        hsnCode: data.hsnCode,
        tdsSection: data.tdsSection || null,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    const best = matches[0];
    return {
      category: best.category,
      confidence: Math.min((best.score / 50) * 100, 95),
      gstRate: best.gstRate,
      hsnCode: best.hsnCode,
      tdsSection: best.tdsSection,
      matchedKeywords: best.matchedKeywords,
    };
  }

  return {
    category: 'Uncategorized',
    confidence: 0,
    gstRate: 18,
    hsnCode: null,
    tdsSection: null,
    matchedKeywords: [],
  };
}

router.post('/suggest', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { description, clientId, vendorName, amount, items } = req.body;

    console.log('🤖 Smart Categorization Request:', {
      description,
      vendorName,
      amount,
    });

    let historicalMatch = null;
    if (vendorName) {
      historicalMatch = await CategoryMapping.findOne({
        organization: organizationId,
        vendorName: { $regex: vendorName, $options: 'i' },
        usageCount: { $gt: 0 },
      }).sort({ usageCount: -1 });
    }

    const patternMatch = findBestCategory(description, vendorName, amount);

    let finalSuggestion;

    if (historicalMatch && historicalMatch.usageCount > 2) {
      finalSuggestion = {
        category: historicalMatch.category,
        confidence: Math.min(85 + historicalMatch.usageCount * 2, 98),
        taxCode: {
          hsnCode: historicalMatch.hsnCode,
          gstRate: historicalMatch.gstRate,
          tdsSection: historicalMatch.tdsSection,
        },
        source: 'historical',
        usageCount: historicalMatch.usageCount,
      };
    } else if (patternMatch.confidence > 0) {
      finalSuggestion = {
        category: patternMatch.category,
        confidence: patternMatch.confidence,
        taxCode: {
          hsnCode: patternMatch.hsnCode,
          gstRate: patternMatch.gstRate,
          tdsSection: patternMatch.tdsSection,
        },
        source: 'pattern',
        matchedKeywords: patternMatch.matchedKeywords,
      };
    } else {
      finalSuggestion = {
        category: 'Uncategorized',
        confidence: 0,
        taxCode: {
          hsnCode: null,
          gstRate: 18,
          tdsSection: null,
        },
        source: 'fallback',
      };
    }

    console.log('✅ Smart Suggestion:', finalSuggestion);

    res.json({
      success: true,
      suggestion: finalSuggestion,
    });
  } catch (error) {
    console.error('❌ Smart categorization error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/learn', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const {
      description,
      vendorName,
      category,
      hsnCode,
      gstRate,
      tdsSection,
      clientId,
    } = req.body;

    console.log('📚 Learning from user selection:', {
      vendorName,
      category,
      hsnCode,
    });

    let mapping = await CategoryMapping.findOne({
      organization: organizationId,
      vendorName,
      category,
    });

    if (mapping) {
      mapping.usageCount += 1;
      mapping.lastUsed = new Date();
      mapping.hsnCode = hsnCode;
      mapping.gstRate = gstRate;
      mapping.tdsSection = tdsSection;
    } else {
      mapping = await CategoryMapping.create({
        organization: organizationId,
        vendorName,
        category,
        hsnCode,
        gstRate,
        tdsSection,
        usageCount: 1,
        lastUsed: new Date(),
      });
    }

    await mapping.save();

    console.log(`✅ Learned: "${vendorName}" → "${category}" (used ${mapping.usageCount} times)`);

    res.json({
      success: true,
      message: 'Learning recorded successfully',
      usageCount: mapping.usageCount,
    });
  } catch (error) {
    console.error('❌ Learning error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { limit = 50 } = req.query;

    const mappings = await CategoryMapping.find({
      organization: organizationId,
    })
      .sort({ usageCount: -1, lastUsed: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: mappings.length,
      mappings,
    });
  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = Object.keys(CATEGORY_PATTERNS).sort();
    
    res.json({
      success: true,
      categories: categories.map(cat => ({
        name: cat,
        gstRate: CATEGORY_PATTERNS[cat].gstRate,
        hsnCode: CATEGORY_PATTERNS[cat].hsnCode,
        tdsSection: CATEGORY_PATTERNS[cat].tdsSection || null,
      })),
    });
  } catch (error) {
    console.error('❌ Categories fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;