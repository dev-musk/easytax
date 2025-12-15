// ============================================
// FILE: server/models/Invoice.js
// ============================================

import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
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
  total: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceType: {
    type: String,
    enum: ['PROFORMA', 'TAX_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'DELIVERY_CHALLAN'],
    required: true,
  },
  
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
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
  
  quotationNumber: String,
  poNumber: String,
  dcNumber: String,
  
  items: [invoiceItemSchema],
  
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
  
  roundOff: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  
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
    enum: ['DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT',
  },
  
  notes: String,
  termsConditions: String,
  
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringFreq: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
  },
  nextRecurDate: Date,
  
  isAutoBill: {
    type: Boolean,
    default: false,
  },
  
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
  
  pdfUrl: String,
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
}, {
  timestamps: true,
});

invoiceSchema.index({ organization: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ dueDate: 1 });

export default mongoose.model('Invoice', invoiceSchema);