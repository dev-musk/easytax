// ============================================
// FILE: server/models/Payment.js
// Payment Model WITH RAZORPAY FIELDS
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
  
  // ✅ NEW: Razorpay Fields
  razorpayOrderId: {
    type: String,
    sparse: true, // Allows null values with unique index
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
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ organization: 1, paymentNumber: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);