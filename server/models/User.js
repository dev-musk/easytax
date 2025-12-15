// ============================================
// FILE: server/models/User.js
// ============================================

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: String,
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'USER', 'ACCOUNTANT'],
    default: 'USER',
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

export default mongoose.model('User', userSchema);
