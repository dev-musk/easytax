// ============================================
// FILE: server/models/Organization.js
// ✅ ENHANCED FIX: Better hook handling + debugging + fallback
// ============================================

import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: String,
  
  // GST & Tax Registration
  gstin: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(v);
      },
      message: 'Invalid GSTIN format (Example: 27AABCU9603R1Z5)'
    }
  },
  
  gstinStateCode: {
    type: String,
  },
  
  pan: {
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(v);
      },
      message: 'Invalid PAN format (Example: AABCU9603R)'
    }
  },
  
  cin: {
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        return cinRegex.test(v);
      },
      message: 'Invalid CIN format (Example: L17110MH1973PLC019786)'
    }
  },
  
  logo: String,
  
  // Address
  address: String,
  city: String,
  state: String,
  pincode: String,
  country: {
    type: String,
    default: 'India',
  },
  
  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
          return ifscRegex.test(v);
        },
        message: 'Invalid IFSC code format (Example: SBIN0001234)'
      }
    },
    accountHolderName: String,
    branchName: String,
    upiId: String,
  },
  
  // Authorized Signatory
  authorizedSignatory: {
    name: String,
    designation: String,
    signatureImage: String,
  },
  
  // Annual Turnover (for HSN digit requirement)
  annualTurnover: {
    type: Number,
    default: 0,
  },
  
  hsnDigitsRequired: {
    type: Number,
    enum: [4, 6, 8],
    default: 4,
  },
  
  // Subscription
  planType: {
    type: String,
    enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
    default: 'FREE',
  },
  maxClients: Number,
  maxInvoices: Number,
  subscriptionEnd: Date,
  
  // Invoice Number Configuration
  invoiceNumberMode: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    default: 'AUTO',
  },
  
  invoiceNumberFormat: {
    type: String,
    default: '{PREFIX}-{FY}-{SEQ}',
  },
  
  invoicePrefix: {
    type: String,
    default: 'INV',
  },
  
  currentFinancialYear: String,
  
  invoiceNumbersByFY: {
    type: Map,
    of: Number,
    default: {},
  },
  
  nextInvoiceNumber: {
    type: Number,
    default: 1,
  },
  
  // Display Settings
  displaySettings: {
    dateFormat: {
      type: String,
      enum: ['DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY'],
      default: 'DD-MM-YYYY',
    },
    amountInWords: {
      type: Boolean,
      default: true,
    },
    showCompanyLogo: {
      type: Boolean,
      default: true,
    },
    showAuthorizedSignature: {
      type: Boolean,
      default: true,
    },
    showBankDetails: {
      type: Boolean,
      default: true,
    },
    defaultTemplate: {
      type: String,
      enum: ['MODERN', 'CLASSIC', 'MINIMAL', 'PROFESSIONAL'],
      default: 'MODERN',
    },
  },
  
  // Settings
  defaultPaymentTerms: {
    type: Number,
    default: 30,
  },
  defaultTaxRate: {
    type: Number,
    default: 18,
  },
  financialYearStart: {
    type: Number,
    default: 4,
  },
}, {
  timestamps: true,
});

// ✅ HELPER FUNCTION: Calculate HSN digits based on turnover
function calculateHSNDigits(turnover) {
  if (turnover <= 50000000) { // ≤ ₹5 crore
    return 4;
  } else { // > ₹5 crore
    return 6;
  }
}

// ✅ ENHANCED: Pre-save hook for save() operations
organizationSchema.pre('save', function(next) {
  console.log('🪝 [PRE-SAVE] Hook triggered');
  
  // Extract GSTIN state code if GSTIN is set
  if (this.gstin && this.gstin.length >= 2) {
    this.gstinStateCode = this.gstin.substring(0, 2);
    console.log(`📍 [PRE-SAVE] Updated gstinStateCode: ${this.gstinStateCode}`);
  }
  
  // ✅ CRITICAL: Update HSN digits when turnover changes
  if (this.isModified('annualTurnover') || this.annualTurnover !== undefined) {
    const oldValue = this.hsnDigitsRequired;
    this.hsnDigitsRequired = calculateHSNDigits(this.annualTurnover);
    console.log(`📊 [PRE-SAVE] Annual Turnover: ₹${this.annualTurnover.toLocaleString('en-IN')}`);
    console.log(`📏 [PRE-SAVE] HSN Digits: ${oldValue} → ${this.hsnDigitsRequired}`);
  }
  
  next();
});

// ✅ ENHANCED: Pre-update hook for findOneAndUpdate() operations
organizationSchema.pre('findOneAndUpdate', function(next) {
  console.log('🪝 [PRE-UPDATE] Hook triggered');
  
  const update = this.getUpdate();
  console.log('📦 [PRE-UPDATE] Raw update object:', JSON.stringify(update, null, 2));
  
  // Handle multiple update formats:
  // 1. { $set: { field: value } }
  // 2. { field: value }
  // 3. Mixed operators
  
  let updateFields = update.$set || update;
  
  // Extract values - prioritize $set, fallback to direct
  const gstin = update.$set?.gstin || update.gstin;
  const annualTurnover = update.$set?.annualTurnover || update.annualTurnover;
  
  console.log(`📊 [PRE-UPDATE] Extracted annualTurnover: ${annualTurnover}`);
  console.log(`🏢 [PRE-UPDATE] Extracted gstin: ${gstin}`);
  
  // Ensure $set object exists
  if (!update.$set) {
    update.$set = {};
  }
  
  // Extract GSTIN state code if GSTIN is being updated
  if (gstin && gstin.length >= 2) {
    const stateCode = gstin.substring(0, 2);
    update.$set.gstinStateCode = stateCode;
    console.log(`📍 [PRE-UPDATE] Setting gstinStateCode: ${stateCode}`);
  }
  
  // ✅ CRITICAL: Update HSN digits when turnover changes
  if (annualTurnover !== undefined && annualTurnover !== null) {
    const hsnDigits = calculateHSNDigits(annualTurnover);
    update.$set.hsnDigitsRequired = hsnDigits;
    
    console.log(`✅ [PRE-UPDATE] Annual Turnover: ₹${annualTurnover.toLocaleString('en-IN')}`);
    console.log(`✅ [PRE-UPDATE] Setting hsnDigitsRequired: ${hsnDigits}`);
    console.log(`💡 [PRE-UPDATE] Rule: ${annualTurnover <= 50000000 ? '≤ ₹5 crore → 4 digits' : '> ₹5 crore → 6 digits'}`);
  }
  
  console.log('📦 [PRE-UPDATE] Final update object:', JSON.stringify(update, null, 2));
  next();
});

// ✅ POST-UPDATE HOOK: Verify the update worked
organizationSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    console.log('✅ [POST-UPDATE] Update completed');
    console.log(`📊 [POST-UPDATE] Final annualTurnover: ₹${doc.annualTurnover?.toLocaleString('en-IN') || 0}`);
    console.log(`📏 [POST-UPDATE] Final hsnDigitsRequired: ${doc.hsnDigitsRequired}`);
  }
});

// Indexes
organizationSchema.index({ gstin: 1 });
organizationSchema.index({ email: 1 });

export default mongoose.model('Organization', organizationSchema);