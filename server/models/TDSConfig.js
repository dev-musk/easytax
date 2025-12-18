// ============================================
// FILE: server/models/TDSConfig.js
// NEW FILE - TDS Configuration Model
// ============================================

import mongoose from 'mongoose';

const tdsConfigSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: [true, 'TDS section is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    rate: {
      type: Number,
      required: [true, 'TDS rate is required'],
      min: 0,
      max: 100,
    },
    applicableFor: {
      type: String,
      enum: ['PRODUCT', 'SERVICE', 'BOTH'],
      default: 'BOTH',
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
tdsConfigSchema.index({ organization: 1, isActive: 1 });
tdsConfigSchema.index({ section: 1, organization: 1 }, { unique: true });

const TDSConfig = mongoose.model('TDSConfig', tdsConfigSchema);

export default TDSConfig;