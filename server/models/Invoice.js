// ============================================
// FILE: server/models/Invoice.js
// ENHANCED WITH ALL SIMPLE FEATURES
// ============================================

import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ["PRODUCT", "SERVICE"],
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
  },
  description: {
    type: String,
    required: true,
  },
  hsnSacCode: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },

  // Item-level discount
  discountType: {
    type: String,
    enum: ["PERCENTAGE", "FIXED"],
  },
  discountValue: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },

  // Amounts
  baseAmount: {
    type: Number,
    required: true,
  },
  taxableAmount: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },

  // GST breakdown
  gstRate: {
    type: Number,
    required: true,
  },
  cgst: {
    type: Number,
    required: true,
  },
  sgst: {
    type: Number,
    required: true,
  },
  igst: {
    type: Number,
    required: true,
  },

  // Total with GST
  totalAmount: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    invoiceType: {
      type: String,
      enum: [
        "PROFORMA",
        "TAX_INVOICE",
        "CREDIT_NOTE",
        "DEBIT_NOTE",
        "DELIVERY_CHALLAN",
      ],
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // ✅ FEATURE #7: Additional Fields
    poNumber: {
      type: String,
      trim: true,
    },
    poDate: {
      type: Date,
    },
    contractNumber: {
      type: String,
      trim: true,
    },
    salesPersonName: {
      type: String,
      trim: true,
    },

    // Reference numbers
    quotationNumber: String,
    dcNumber: String,

    // Items
    items: [invoiceItemSchema],

    // Subtotal and discounts
    subtotal: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
    },
    discountValue: Number,
    discountAmount: {
      type: Number,
      default: 0,
    },

    // GST totals
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    igst: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },

    // TDS
    tdsApplicable: {
      type: Boolean,
      default: false,
    },
    tdsSection: String,
    tdsRate: Number,
    tdsAmount: {
      type: Number,
      default: 0,
    },

    // ✅ FEATURE #8: TCS Provision
    tcsApplicable: {
      type: Boolean,
      default: false,
    },
    tcsRate: {
      type: Number,
      default: 0,
    },
    tcsAmount: {
      type: Number,
      default: 0,
    },

    // ✅ FEATURE #2: Reverse Charge
    reverseCharge: {
      type: Boolean,
      default: false,
    },

    // Totals
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // Amount in Words
    amountInWords: {
      type: String,
      default: "",
    },

    // Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      default: "DRAFT",
    },

    // Notes and terms
    notes: String,
    termsConditions: String,

    // ✅ FEATURE #32: Quick Notes
    quickNotes: [{
      note: {
        type: String,
        required: true,
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // GST Calculation Metadata (for FEATURE #11)
    gstCalculationMeta: {
      clientStateCode: String,
      orgStateCode: String,
      transactionType: {
        type: String,
        enum: [
          "INTRASTATE",
          "INTERSTATE",
          "B2C",
          "B2B_INTRASTATE",
          "B2B_INTERSTATE",
        ],
      },
      isInterstate: Boolean,
      calculatedAt: {
        type: Date,
        default: Date.now,
      },
      gstSplit: String,
      clientState: String,
      orgState: String,
    },

    // ✅ FEATURE #36: Document Attachments
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

    // E-Invoice
    eInvoice: {
      enabled: { type: Boolean, default: false },
      irn: { type: String, trim: true },
      ackNo: { type: String, trim: true },
      ackDate: { type: Date },
      qrCode: { type: String },
      signedInvoice: { type: String },
      status: {
        type: String,
        enum: ["NOT_GENERATED", "GENERATED", "CANCELLED"],
        default: "NOT_GENERATED",
      },
      cancelDate: Date,
      cancelReason: String,
    },

    // E-Way Bill
    eWayBill: {
      enabled: { type: Boolean, default: false },
      ewbNumber: { type: String, trim: true },
      ewbDate: { type: Date },
      validUpto: { type: Date },
      transportMode: {
        type: String,
        enum: ["ROAD", "RAIL", "AIR", "SHIP"],
      },
      vehicleNumber: String,
      transporterName: String,
      transporterId: String,
      distance: Number,
      status: {
        type: String,
        enum: ["NOT_GENERATED", "GENERATED", "CANCELLED", "EXPIRED"],
        default: "NOT_GENERATED",
      },
    },

    // ✅ FEATURE #41: GST Filing Status
    gstFilingStatus: {
      gstr1Filed: {
        type: Boolean,
        default: false,
      },
      gstr1FiledDate: Date,
      gstr3bFiled: {
        type: Boolean,
        default: false,
      },
      gstr3bFiledDate: Date,
      filingPeriod: String, // e.g., "Jan 2026"
    },

    // Template
    template: {
      type: String,
      enum: ["MODERN", "CLASSIC", "MINIMAL", "PROFESSIONAL"],
      default: "MODERN",
    },

    // Recurring invoice
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFreq: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"],
    },
    nextRecurDate: Date,
    recurringInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringInvoice",
    },

    // Auto billing
    isAutoBill: {
      type: Boolean,
      default: false,
    },

    // Communication tracking
    emailSent: {
      type: Boolean,
      default: false,
    },
    whatsappSent: {
      type: Boolean,
      default: false,
    },
    lastSentAt: Date,
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: Date,

    // PDF
    pdfUrl: String,

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invoiceSchema.index({ organization: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ 'eInvoice.irn': 1 }, { sparse: true });
invoiceSchema.index({ 'eWayBill.ewbNumber': 1 }, { sparse: true });

// Pre-save hook to update status based on payment
invoiceSchema.pre("save", function (next) {
  if (this.balanceAmount <= 0) {
    this.status = "PAID";
  } else if (this.paidAmount > 0) {
    this.status = "PARTIALLY_PAID";
  } else if (this.dueDate < new Date() && this.status !== "PAID") {
    this.status = "OVERDUE";
  } else if (this.status === "DRAFT") {
    // Keep as DRAFT
  } else {
    this.status = "PENDING";
  }
  next();
});

export default mongoose.model("Invoice", invoiceSchema);