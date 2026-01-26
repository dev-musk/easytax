// ============================================
// FILE: server/models/Payment.js
// ✅ FEATURE #51: Added bank field
// ============================================

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  
  // ✅ FEATURE #51: Bank Account Reference
  bank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true,
  },
  
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMode: {
    type: String,
    enum: ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD', 'ONLINE', 'OTHER'],
    required: true,
  },
  referenceNumber: String,
  bankName: String,
  notes: String,
  
  // Mark this as primary/main payment
  isPrimary: {
    type: Boolean,
    default: false,
  },
  
  // Razorpay Fields
  razorpayOrderId: {
    type: String,
    sparse: true,
  },
  razorpayPaymentId: {
    type: String,
    sparse: true,
  },
  razorpaySignature: {
    type: String,
  },
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ bank: 1 }); // ✅ FEATURE #51: Index for bank queries
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ organization: 1, paymentNumber: 1 }, { unique: true });
paymentSchema.index({ invoice: 1, isPrimary: 1 }); // Find primary payment for invoice

export default mongoose.model('Payment', paymentSchema);