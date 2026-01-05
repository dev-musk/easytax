// ============================================
// FILE: server/models/HSNCode.js
// HSN/SAC Code Master Database Model
// ============================================

import mongoose from 'mongoose';

const hsnCodeSchema = new mongoose.Schema({
  // HSN/SAC Code
  code: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
    trim: true,
  },
  
  // Description from GST portal
  description: {
    type: String,
    required: true,
    index: 'text', // Enable text search
  },
  
  // Type: GOODS or SERVICES
  type: {
    type: String,
    enum: ['GOODS', 'SERVICES'],
    default: 'GOODS',
  },
  
  // Common GST rates for this HSN (multiple rates possible)
  gstRates: [{
    type: Number,
    min: 0,
    max: 28,
  }],
  
  // Most common/default GST rate
  defaultGstRate: {
    type: Number,
    default: 18,
  },
  
  // Chapter (first 2 digits)
  chapter: {
    type: String,
    index: true,
  },
  
  // Heading (first 4 digits)
  heading: {
    type: String,
    index: true,
  },
  
  // Level of detail (4, 6, or 8 digits)
  level: {
    type: Number,
    enum: [2, 4, 6, 8],
    default: 6,
  },
  
  // Is this code still active?
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Keywords for better search (auto-generated)
  keywords: [{
    type: String,
  }],
  
  // Usage count (how many times used in invoices)
  usageCount: {
    type: Number,
    default: 0,
  },
  
  // Import metadata
  importedAt: {
    type: Date,
    default: Date.now,
  },
  
  lastUsedAt: Date,
}, {
  timestamps: true,
});

// Compound indexes for faster search
hsnCodeSchema.index({ code: 1, type: 1 });
hsnCodeSchema.index({ chapter: 1, heading: 1 });
hsnCodeSchema.index({ description: 'text', keywords: 'text' });
hsnCodeSchema.index({ usageCount: -1 }); // Popular codes first

// Pre-save hook to extract chapter, heading, and generate keywords
hsnCodeSchema.pre('save', function(next) {
  if (this.code) {
    // Extract chapter (first 2 digits)
    if (this.code.length >= 2) {
      this.chapter = this.code.substring(0, 2);
    }
    
    // Extract heading (first 4 digits)
    if (this.code.length >= 4) {
      this.heading = this.code.substring(0, 4);
    }
    
    // Determine level based on code length
    const cleanCode = this.code.replace(/\s/g, '');
    if (cleanCode.length === 2) this.level = 2;
    else if (cleanCode.length === 4) this.level = 4;
    else if (cleanCode.length === 6) this.level = 6;
    else if (cleanCode.length === 8) this.level = 8;
    
    // Generate keywords from description for better search
    if (this.description && (!this.keywords || this.keywords.length === 0)) {
      const words = this.description
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2); // Only words longer than 2 chars
      this.keywords = [...new Set(words)]; // Remove duplicates
    }
  }
  
  next();
});

// Static method to search HSN codes
hsnCodeSchema.statics.searchHSN = async function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  
  // Try multiple search strategies
  const results = await this.find({
    $or: [
      // Exact code match (highest priority)
      { code: searchRegex },
      // Description match
      { description: searchRegex },
      // Keywords match
      { keywords: searchRegex },
    ],
    isActive: true,
  })
  .sort({ usageCount: -1, code: 1 }) // Popular codes first
  .limit(limit)
  .select('code description type defaultGstRate gstRates usageCount');
  
  return results;
};

// Static method to get popular HSN codes
hsnCodeSchema.statics.getPopular = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('code description type defaultGstRate usageCount');
};

// Static method to increment usage count
hsnCodeSchema.statics.incrementUsage = async function(code) {
  await this.findOneAndUpdate(
    { code: code },
    { 
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() }
    }
  );
};

export default mongoose.model('HSNCode', hsnCodeSchema);