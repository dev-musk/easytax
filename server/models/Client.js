// ============================================
// FILE: server/models/Client.js
// ============================================

import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  clientCode: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  gstin: String,
  pan: String,
  isTaxable: {
    type: Boolean,
    default: true,
  },
  logo: String,
  
  // Contact
  contactPerson: String,
  email: String,
  phone: String,
  alternatePhone: String,
  
  // Billing Address
  billingAddress: String,
  billingCity: String,
  billingState: String,
  billingPincode: String,
  billingCountry: {
    type: String,
    default: 'India',
  },
  
  // Shipping Address
  shippingAddress: String,
  shippingCity: String,
  shippingState: String,
  shippingPincode: String,
  shippingCountry: {
    type: String,
    default: 'India',
  },
  sameAsBilling: {
    type: Boolean,
    default: true,
  },
  
  // Settings
  paymentTerms: {
    type: Number,
    default: 30,
  },
  defaultTaxRate: Number,
  creditLimit: Number,
  
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

clientSchema.index({ organization: 1, clientCode: 1 }, { unique: true });
clientSchema.index({ gstin: 1 });
clientSchema.index({ companyName: 'text', contactPerson: 'text' });

export default mongoose.model('Client', clientSchema);
