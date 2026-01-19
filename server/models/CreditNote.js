// ============================================
// FILE: server/models/CreditNote.js
// Credit Note Model for Adjustments
// ============================================

import mongoose from 'mongoose';

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
      type: String,
      required: true,
      unique: true,
    },
    originalInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    creditNoteDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'GOODS_RETURNED',
        'SERVICE_DEFICIENCY',
        'DISCOUNT',
        'POST_SALE_DISCOUNT',
        'PRICE_ADJUSTMENT',
        'CANCELLATION',
        'OTHER',
      ],
    },
    reasonDescription: {
      type: String,
      trim: true,
    },
    items: [
      {
        description: { type: String, required: true },
        hsnSacCode: String,
        quantity: { type: Number, required: true, min: 0 },
        unit: {
          type: String,
          enum: ['PCS', 'KG', 'LITER', 'METER', 'BOX', 'HOUR', 'DAY', 'MONTH', 'SET', 'UNIT'],
          required: true,
        },
        rate: { type: Number, required: true, min: 0 },
        gstRate: {
          type: Number,
          enum: [0, 5, 12, 18, 28],
          required: true,
        },
        itemType: {
          type: String,
          enum: ['PRODUCT', 'SERVICE'],
          required: true,
        },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'APPLIED'],
      default: 'ISSUED',
    },
    appliedDate: Date,
    notes: String,
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
creditNoteSchema.index({ organization: 1, creditNoteDate: -1 });
creditNoteSchema.index({ originalInvoice: 1 });
creditNoteSchema.index({ client: 1 });

const CreditNote = mongoose.model('CreditNote', creditNoteSchema);

export default CreditNote;