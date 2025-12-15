// ============================================
// FILE: server/models/Organization.js
// ============================================

import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: String,
  gstin: {
    type: String,
    unique: true,
    sparse: true,
  },
  pan: String,
  logo: String,
  
  // Address
  address: String,
  city: String,
  state: String,
  pincode: String,
  country: {
    type: String,
    default: 'India',
  },
  
  // Subscription
  planType: {
    type: String,
    enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
    default: 'FREE',
  },
  maxClients: Number,
  maxInvoices: Number,
  subscriptionEnd: Date,
  
  // Settings
  defaultPaymentTerms: {
    type: Number,
    default: 30,
  },
  defaultTaxRate: {
    type: Number,
    default: 18,
  },
  financialYearStart: {
    type: Number,
    default: 4,
  },
  invoicePrefix: {
    type: String,
    default: 'INV',
  },
  nextInvoiceNumber: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Organization', organizationSchema);