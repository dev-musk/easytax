// ============================================
// FILE: server/models/BankAccount.js
// ✅ FEATURE #28: Bank Account Management
// ============================================

import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    // Account Information
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Allow empty or valid account number (9-18 digits)
          if (!v) return true;
          return /^\d{9,18}$/.test(v);
        },
        message: "Account number must be 9-18 digits",
      },
    },
    accountType: {
      type: String,
      enum: ["SAVINGS", "CURRENT", "OPERATING", "CASH"],
      default: "CURRENT",
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[A-Z0-9]{11}$/.test(v);
        },
        message: "IFSC code must be 11 characters",
      },
    },
    swiftCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    // Balance Information
    openingBalance: {
      type: Number,
      default: 0,
      get: function (value) {
        return Math.round(value * 100) / 100;
      },
    },
    currentBalance: {
      type: Number,
      default: 0,
      get: function (value) {
        return Math.round(value * 100) / 100;
      },
    },

    // Pre-save hook to initialize currentBalance from openingBalance
    _initializeBalance: {
      type: Boolean,
      default: false,
    },
    lastReconciliationDate: {
      type: Date,
    },
    lastReconciliationBalance: {
      type: Number,
    },

    // Bank Details
    accountHolderName: {
      type: String,
      trim: true,
    },
    accountHolderPAN: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: "Invalid PAN format",
      },
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // UPI Details (for QR code generation)
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(v);
        },
        message: "Invalid UPI ID format",
      },
    },

    // Bank Statement Details
    lastStatementDate: {
      type: Date,
    },
    lastStatementClosingBalance: {
      type: Number,
    },
    bankStatementReference: {
      type: String,
      trim: true,
    },

    // Organization Reference
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Notes
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes
bankAccountSchema.index(
  { organization: 1, accountNumber: 1 },
  { unique: true, sparse: true }
);
bankAccountSchema.index({ organization: 1, isActive: 1 });
bankAccountSchema.index({ organization: 1, isArchived: 1 });
bankAccountSchema.index({ createdAt: -1 });

// ✅ Pre-save hook to initialize currentBalance from openingBalance
bankAccountSchema.pre("save", function (next) {
  // If this is a new document or currentBalance hasn't been set, use openingBalance
  if (this.isNew && this.currentBalance === 0 && this.openingBalance > 0) {
    this.currentBalance = this.openingBalance;
  }
  next();
});

export default mongoose.model("BankAccount", bankAccountSchema);