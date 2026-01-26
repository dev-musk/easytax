// ============================================
// FILE: server/models/Organization.js
// ✅ ADD THIS BRANCHES SCHEMA
// ============================================

import mongoose from "mongoose";

// ✅ NEW: Sub-schema for organization branches
const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{6}$/.test(v);
        },
        message: "Pincode must be 6 digits",
      },
    },
    gstin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          const gstinRegex =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          return gstinRegex.test(v);
        },
        message: "Invalid GSTIN format (Example: 27AABCU9603R1Z5)",
      },
    },
    contactPerson: String,
    email: String,
    phone: String,
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Sub-schema for GSTIN entries
const gstinEntrySchema = new mongoose.Schema(
  {
    gstin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          const gstinRegex =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          return gstinRegex.test(v);
        },
        message: "Invalid GSTIN format (Example: 27AABCU9603R1Z5)",
      },
    },
    stateCode: {
      type: String,
      required: true,
    },
    stateName: {
      type: String,
      required: true,
    },
    tradeName: {
      type: String,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    invoicePrefix: {
      type: String,
      default: "INV",
    },
    invoiceNumbersByFY: {
      type: Map,
      of: Number,
      default: {},
    },
    nextInvoiceNumber: {
      type: Number,
      default: 1,
    },
    registrationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const organizationSchema = new mongoose.Schema(
  {
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

    // ✅ ADD THIS: Branches array for organization branch management
    branches: [branchSchema],

    // Multi-GSTIN Support
    gstinEntries: [gstinEntrySchema],

    // Legacy fields (kept for backward compatibility)
    gstin: {
      type: String,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    gstinStateCode: String,

    pan: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          return panRegex.test(v);
        },
        message: "Invalid PAN format (Example: AABCU9603R)",
      },
    },

    cin: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const cinRegex = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
          return cinRegex.test(v);
        },
        message: "Invalid CIN format (Example: L17110MH1973PLC019786)",
      },
    },

    // MSME/Udyam Registration
    udyamNumber: {
      type: String,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const udyamRegex = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
          return udyamRegex.test(v);
        },
        message: "Invalid Udyam number format (Expected: UDYAM-XX-00-0000000)",
      },
    },

    msmeCategory: {
      type: String,
      enum: ["MICRO", "SMALL", "MEDIUM", "NOT_MSME"],
      default: "NOT_MSME",
    },

    logo: String,

    // Head Office Address
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: "India",
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
          validator: function (v) {
            if (!v) return true;
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            return ifscRegex.test(v);
          },
          message: "Invalid IFSC code format (Example: SBIN0001234)",
        },
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

    // Annual Turnover
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
      enum: ["FREE", "BASIC", "PRO", "ENTERPRISE"],
      default: "FREE",
    },
    maxClients: Number,
    maxInvoices: Number,
    subscriptionEnd: Date,

    // Global Invoice Number Configuration
    invoiceNumberMode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "AUTO",
    },

    invoiceNumberFormat: {
      type: String,
      default: "{PREFIX}-{FY}-{SEQ}",
    },

    invoicePrefix: {
      type: String,
      default: "INV",
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

    nextCSRNumber: {
      type: Number,
      default: 1,
    },

    // Display Settings
    displaySettings: {
      dateFormat: {
        type: String,
        enum: ["DD-MM-YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "MM-DD-YYYY"],
        default: "DD-MM-YYYY",
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
        enum: ["MODERN", "CLASSIC", "MINIMAL", "PROFESSIONAL"],
        default: "MODERN",
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
  },
  {
    timestamps: true,
  }
);

// Helper function
function calculateHSNDigits(turnover) {
  if (turnover <= 50000000) {
    return 4;
  } else {
    return 6;
  }
}

// Pre-save hook
organizationSchema.pre("save", function (next) {
  // Extract GSTIN state code if GSTIN is set
  if (this.gstin && this.gstin.length >= 2) {
    this.gstinStateCode = this.gstin.substring(0, 2);
  }

  // Update HSN digits when turnover changes
  if (this.isModified("annualTurnover") || this.annualTurnover !== undefined) {
    this.hsnDigitsRequired = calculateHSNDigits(this.annualTurnover);
  }

  // ✅ NEW: Ensure only one default branch
  if (this.branches && this.branches.length > 0) {
    const defaultCount = this.branches.filter((b) => b.isDefault).length;
    if (defaultCount === 0) {
      const firstActive = this.branches.find((b) => b.isActive);
      if (firstActive) firstActive.isDefault = true;
    } else if (defaultCount > 1) {
      let foundFirst = false;
      this.branches.forEach((b) => {
        if (b.isDefault && !foundFirst) {
          foundFirst = true;
        } else if (b.isDefault) {
          b.isDefault = false;
        }
      });
    }
  }

  // Ensure only one default GSTIN
  if (this.gstinEntries && this.gstinEntries.length > 0) {
    const defaultCount = this.gstinEntries.filter((g) => g.isDefault).length;
    if (defaultCount === 0) {
      const firstActive = this.gstinEntries.find((g) => g.isActive);
      if (firstActive) firstActive.isDefault = true;
    } else if (defaultCount > 1) {
      let foundFirst = false;
      this.gstinEntries.forEach((g) => {
        if (g.isDefault && !foundFirst) {
          foundFirst = true;
        } else if (g.isDefault) {
          g.isDefault = false;
        }
      });
    }
  }

  next();
});

// Pre-update hook
organizationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  let updateFields = update.$set || update;

  const gstin = update.$set?.gstin || update.gstin;
  const annualTurnover = update.$set?.annualTurnover || update.annualTurnover;

  if (!update.$set) {
    update.$set = {};
  }

  if (gstin && gstin.length >= 2) {
    const stateCode = gstin.substring(0, 2);
    update.$set.gstinStateCode = stateCode;
  }

  if (annualTurnover !== undefined && annualTurnover !== null) {
    const hsnDigits = calculateHSNDigits(annualTurnover);
    update.$set.hsnDigitsRequired = hsnDigits;
  }

  next();
});

// Indexes
organizationSchema.index({ email: 1 });
organizationSchema.index({ "branches.gstin": 1 }); // ✅ NEW
organizationSchema.index({ "gstinEntries.gstin": 1 });
organizationSchema.index({ udyamNumber: 1 });

export default mongoose.model("Organization", organizationSchema);