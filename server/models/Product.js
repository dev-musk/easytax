// ============================================
// FILE: server/models/Product.js
// NEW FILE - Product/Service Master Model
// ============================================

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product/Service name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['PRODUCT', 'SERVICE'],
      required: [true, 'Type is required'],
      default: 'PRODUCT',
    },
    hsnSacCode: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    unit: {
      type: String,
      enum: ['PCS', 'KG', 'LITER', 'METER', 'BOX', 'HOUR', 'DAY', 'MONTH', 'SET', 'UNIT'],
      required: [true, 'Unit is required'],
      default: 'PCS',
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      default: 0,
      min: 0,
    },
    gstRate: {
      type: Number,
      required: [true, 'GST rate is required'],
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },
    category: {
      type: String,
      trim: true,
      default: '',
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
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
productSchema.index({ name: 'text', hsnSacCode: 'text', description: 'text' });
productSchema.index({ organization: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;