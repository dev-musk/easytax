// ============================================
// FILE: server/models/Invoice.js
// PHASE 3 COMPLETE - With E-Invoice & E-Way Bill
// REPLACE YOUR CURRENT FILE WITH THIS
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

    // Reference numbers
    quotationNumber: String,
    poNumber: String,
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

    // TDS/TCS
    tdsApplicable: {
      type: Boolean,
      default: false,
    },
    tdsRate: Number,
    tdsAmount: {
      type: Number,
      default: 0,
    },
    tcsApplicable: {
      type: Boolean,
      default: false,
    },
    tcsRate: Number,
    tcsAmount: {
      type: Number,
      default: 0,
    },

    // Reverse Charge
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

    // GST Calculation Metadata
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
      gstSplit: String, // 'CGST+SGST' or 'IGST'
      clientState: String,
      orgState: String,
    },

    // Document Attachments
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

    // ✅ PHASE 3: E-Invoice (for businesses >₹5 crore) - Manual Mode
    eInvoice: {
      enabled: { type: Boolean, default: false },
      irn: { type: String, trim: true },                    // Invoice Reference Number
      ackNo: { type: String, trim: true },                  // Acknowledgement Number
      ackDate: { type: Date },                              // Acknowledgement Date
      qrCode: { type: String },                             // Base64 QR Code
      signedInvoice: { type: String },                      // Digitally signed invoice
      status: {
        type: String,
        enum: ["NOT_GENERATED", "GENERATED", "CANCELLED"],
        default: "NOT_GENERATED",
      },
      cancelDate: Date,
      cancelReason: String,
    },

    // ✅ PHASE 3: E-Way Bill (for goods >₹50,000) - Manual Mode
    eWayBill: {
      enabled: { type: Boolean, default: false },
      ewbNumber: { type: String, trim: true },              // E-Way Bill Number
      ewbDate: { type: Date },                              // E-Way Bill Date
      validUpto: { type: Date },                            // Valid Until
      transportMode: {
        type: String,
        enum: ["ROAD", "RAIL", "AIR", "SHIP"],
      },
      vehicleNumber: String,
      transporterName: String,
      transporterId: String,
      distance: Number,                                      // in KM
      status: {
        type: String,
        enum: ["NOT_GENERATED", "GENERATED", "CANCELLED", "EXPIRED"],
        default: "NOT_GENERATED",
      },
    },

    // ✅ PHASE 3: Template Selection
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