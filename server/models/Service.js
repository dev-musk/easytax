// ============================================
// FILE: server/models/Service.js
// ============================================

import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  sacCode: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: 'Hour',
  },
  gstRate: {
    type: Number,
    required: true,
  },
  isTaxable: {
    type: Boolean,
    default: true,
  },
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

export default mongoose.model('Service', serviceSchema);