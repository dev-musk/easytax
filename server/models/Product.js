
// ============================================
// FILE: server/models/Product.js
// ============================================

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  hsnCode: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: 'Pcs',
  },
  gstRate: {
    type: Number,
    required: true,
  },
  isTaxable: {
    type: Boolean,
    default: true,
  },
  trackStock: {
    type: Boolean,
    default: false,
  },
  currentStock: Number,
  isActive: {
    type: Boolean,
    default: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Product', productSchema);