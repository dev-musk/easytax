// ============================================
// FILE: server/models/Quotation.js
// PHASE 4: Quotation Model
// ============================================

import mongoose from 'mongoose';

const quotationItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['PRODUCT', 'SERVICE'],
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
  },
  description: {
    type: String,
    required: true,
  },
  subDescription: {
    type: String,
    default: '',
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
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
  },
  discountValue: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
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
  totalAmount: {
    type: Number,
    required: true,
  },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    quotationDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    items: [quotationItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
    },
    discountValue: Number,
    discountAmount: {
      type: Number,
      default: 0,
    },
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
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountInWords: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'],
      default: 'DRAFT',
    },
    notes: String,
    termsConditions: String,
    convertedToInvoice: {
      type: Boolean,
      default: false,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    convertedAt: Date,
    template: {
      type: String,
      enum: ['MODERN', 'CLASSIC', 'MINIMAL', 'PROFESSIONAL'],
      default: 'MODERN',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
quotationSchema.index({ organization: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ client: 1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ quotationDate: 1 });

// Pre-save hook to check expiry
quotationSchema.pre('save', function (next) {
  if (this.validUntil < new Date() && this.status !== 'CONVERTED' && this.status !== 'ACCEPTED' && this.status !== 'REJECTED') {
    this.status = 'EXPIRED';
  }
  next();
});

export default mongoose.model('Quotation', quotationSchema);