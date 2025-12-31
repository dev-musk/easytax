// ============================================
// FILE: server/models/Organization.js (FIXED VERSION)
// Phase 1 Implementation - Removed gstinStateCode validator
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
        // GSTIN format: 27AABCU9603R1Z5
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(v);
      },
      message: 'Invalid GSTIN format (Example: 27AABCU9603R1Z5)'
    }
  },
  
  // FIXED: Removed validator - this is auto-calculated in pre-save hook
  gstinStateCode: {
    type: String,
    // Auto-extracted from GSTIN in pre-save hook
  },
  
  pan: {
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // PAN format: AABCU9603R
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(v);
      },
      message: 'Invalid PAN format (Example: AABCU9603R)'
    }
  },
  
  // CIN (Corporate Identification Number) - NEW
  cin: {
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // CIN format: L17110MH1973PLC019786
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
  
  // Bank Details - NEW
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
          // IFSC format: SBIN0001234
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
  
  // Authorized Signatory - NEW
  authorizedSignatory: {
    name: String,
    designation: String,
    signatureImage: String,
  },
  
  // Annual Turnover (for HSN digit requirement) - NEW
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
  
  // Invoice Number Configuration - NEW
  invoiceNumberMode: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    default: 'AUTO',
  },
  
  invoiceNumberFormat: {
    type: String,
    default: '{PREFIX}-{FY}-{SEQ}',
    // Supported placeholders:
    // {PREFIX} - Invoice prefix
    // {FY} - Financial year (2024-25)
    // {YEAR} - Full year (2024)
    // {YY} - Short year (24)
    // {MONTH} - Month (01-12)
    // {DAY} - Day (01-31)
    // {SEQ} - Sequence number
    // {GSTIN_STATE} - State code from GSTIN
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
  
  // Display Settings - NEW
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
  defaultTemplate: {  // ✅ ADD THIS ENTIRE BLOCK
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
    default: 4, // April
  },
}, {
  timestamps: true,
});

// FIXED: Added middleware for findOneAndUpdate to auto-set gstinStateCode
organizationSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Handle both $set and direct updates
  const gstin = update.$set?.gstin || update.gstin;
  
  if (gstin && gstin.length >= 2) {
    const stateCode = gstin.substring(0, 2);
    
    if (update.$set) {
      update.$set.gstinStateCode = stateCode;
    } else {
      update.gstinStateCode = stateCode;
    }
    
    // Auto-determine HSN digits based on turnover
    const annualTurnover = update.$set?.annualTurnover || update.annualTurnover;
    if (annualTurnover !== undefined) {
      const hsnDigits = annualTurnover <= 50000000 ? 4 : 6;
      if (update.$set) {
        update.$set.hsnDigitsRequired = hsnDigits;
      } else {
        update.hsnDigitsRequired = hsnDigits;
      }
    }
  }
  
  next();
});

// Pre-save hook to auto-extract GSTIN state code (for save() operations)
organizationSchema.pre('save', function(next) {
  if (this.gstin && this.gstin.length >= 2) {
    this.gstinStateCode = this.gstin.substring(0, 2);
    
    // Auto-determine HSN digits required based on turnover
    if (this.annualTurnover <= 50000000) { // ≤ ₹5 crore
      this.hsnDigitsRequired = 4;
    } else {
      this.hsnDigitsRequired = 6;
    }
  }
  next();
});

// Indexes
organizationSchema.index({ gstin: 1 });
organizationSchema.index({ email: 1 });

export default mongoose.model('Organization', organizationSchema);