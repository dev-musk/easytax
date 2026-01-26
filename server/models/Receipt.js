// ============================================
// FILE: server/models/Receipt.js
// ✅ FEATURE #51: Added bank field
// ============================================

import mongoose from "mongoose";

const receiptItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "CASH_PAYMENT",
      "TDS_RECEIVABLE",
      "ADVANCE_ADJUSTMENT",
      "RETURN_REFUND",
      "BANK_CHARGES",
      "DISCOUNT",
      "WRITEOFF",
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  tdsSection: {
    type: String,
    enum: ["194C", "194J", "194H", "194I", "194Q", "OTHER", null],
    default: null,
  },
  tdsRate: {
    type: Number,
    default: 0,
  },

  tdsCertificateNumber: String,
  tdsDeductedBy: String,

  advanceReceiptNumber: String,
  advanceDate: Date,

  returnReason: String,
  originalInvoiceNumber: String,

  notes: String,
});

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },

    receiptType: {
      type: String,
      enum: ["INVOICE_PAYMENT", "ADVANCE_RECEIPT", "ON_ACCOUNT", "REFUND"],
      required: true,
      default: "INVOICE_PAYMENT",
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },

    // ✅ FEATURE #51: Bank Account Reference
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },

    receiptDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    items: [receiptItemSchema],

    paymentMode: {
      type: String,
      enum: [
        "CASH",
        "CHEQUE",
        "BANK_TRANSFER",
        "UPI",
        "CARD",
        "ONLINE",
        "NEFT",
        "RTGS",
        "IMPS",
      ],
      required: true,
    },

    referenceNumber: String,
    bankName: String,
    chequeNumber: String,
    chequeDate: Date,
    upiTransactionId: String,

    totalCashReceived: {
      type: Number,
      default: 0,
    },
    totalTDSReceivable: {
      type: Number,
      default: 0,
    },
    totalAdvanceAdjusted: {
      type: Number,
      default: 0,
    },
    totalRefund: {
      type: Number,
      default: 0,
    },
    totalReceipt: {
      type: Number,
      required: true,
      default: 0,
    },

    invoiceAllocation: {
      invoiceAmount: Number,
      amountAllocated: Number,
      balanceRemaining: Number,
      allocationPercentage: Number,
    },

    itemAllocations: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        itemDescription: String,
        itemAmount: Number,
        allocationAmount: Number,
        allocationPercentage: Number,
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "RECONCILED"],
      default: "ACTIVE",
    },

    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelReason: String,

    notes: String,
    internalNotes: String,

    reconciledWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransaction",
    },
    reconciledAt: Date,

    attachments: [
      {
        filename: String,
        originalName: String,
        filepath: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        description: String,
      },
    ],

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
receiptSchema.index({ organization: 1, receiptNumber: 1 }, { unique: true });
receiptSchema.index({ client: 1 });
receiptSchema.index({ invoice: 1 });
receiptSchema.index({ bank: 1 }); // ✅ FEATURE #51: Index for bank queries
receiptSchema.index({ receiptDate: 1 });
receiptSchema.index({ status: 1 });

// Calculate totals BEFORE validation
receiptSchema.pre("validate", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalCashReceived = this.items
      .filter((item) => item.type === "CASH_PAYMENT")
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    this.totalTDSReceivable = this.items
      .filter((item) => item.type === "TDS_RECEIVABLE")
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    this.totalAdvanceAdjusted = this.items
      .filter((item) => item.type === "ADVANCE_ADJUSTMENT")
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    this.totalRefund = this.items
      .filter((item) => item.type === "RETURN_REFUND")
      .reduce((sum, item) => sum + Math.abs(item.amount || 0), 0);

    // Total receipt = Cash + TDS + Advance - Refund
    this.totalReceipt =
      this.totalCashReceived +
      this.totalTDSReceivable +
      this.totalAdvanceAdjusted -
      this.totalRefund;
  } else {
    this.totalReceipt = 0;
  }

  next();
});

export default mongoose.model("Receipt", receiptSchema);