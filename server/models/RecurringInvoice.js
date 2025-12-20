// ============================================
// FILE: server/models/RecurringInvoice.js
// NEW FILE - Recurring Invoice Automation Model
// ============================================

import mongoose from 'mongoose';

const recurringInvoiceSchema = new mongoose.Schema(
  {
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
    },
    invoiceType: {
      type: String,
      enum: ['PROFORMA', 'TAX_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'],
      default: 'TAX_INVOICE',
    },
    items: [
      {
        description: { type: String, required: true },
        hsnSacCode: String,
        quantity: { type: Number, required: true, min: 0 },
        unit: {
          type: String,
          enum: ['PCS', 'KG', 'LITER', 'METER', 'BOX', 'HOUR', 'DAY', 'MONTH', 'YEAR', 'SET', 'UNIT'],
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
        discountType: {
          type: String,
          enum: ['PERCENTAGE', 'FIXED'],
          default: 'PERCENTAGE',
        },
        discountValue: { type: Number, default: 0, min: 0 },
        discountAmount: { type: Number, default: 0 },
        taxableAmount: { type: Number, default: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      default: 'PERCENTAGE',
    },
    discountValue: { type: Number, default: 0, min: 0 },
    tdsSection: String,
    tdsRate: { type: Number, default: 0, min: 0 },
    notes: String,
    
    // Recurring Configuration
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    nextInvoiceDate: {
      type: Date,
      required: true,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    
    // Status & Tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    invoicesGenerated: {
      type: Number,
      default: 0,
    },
    lastGeneratedDate: Date,
    
    // Auto-send Configuration
    autoSend: {
      type: Boolean,
      default: false,
    },
    sendVia: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'BOTH'],
      default: 'EMAIL',
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

// Index for efficient queries
recurringInvoiceSchema.index({ organization: 1, isActive: 1 });
recurringInvoiceSchema.index({ nextInvoiceDate: 1, isActive: 1 });

const RecurringInvoice = mongoose.model('RecurringInvoice', recurringInvoiceSchema);

export default RecurringInvoice;