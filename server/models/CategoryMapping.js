// ============================================
// FILE: server/models/CategoryMapping.js
// ✅ FEATURE #45: SMART CATEGORIZATION - PERSISTENCE MODEL
// CREATE THIS NEW FILE
// ============================================

import mongoose from 'mongoose';

const categoryMappingSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    
    // Vendor/Client association
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    
    // Category assigned
    category: {
      type: String,
      required: true,
      index: true,
    },
    
    // Learning metrics
    confidence: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    
    usageCount: {
      type: Number,
      default: 1,
    },
    
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    
    // Tax implications
    suggestedGstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
    },
    
    suggestedTdsSection: {
      type: String,
    },
    
    // Keywords that triggered this mapping
    keywords: [{
      type: String,
    }],
    
    // User feedback
    userConfirmed: {
      type: Boolean,
      default: false,
    },
    
    userCorrected: {
      type: Boolean,
      default: false,
    },
    
    // Manual override
    isManual: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast lookups
categoryMappingSchema.index({ organization: 1, client: 1, category: 1 });
categoryMappingSchema.index({ organization: 1, category: 1, confidence: -1 });
categoryMappingSchema.index({ organization: 1, usageCount: -1 });

// Static method: Get best category for a client
categoryMappingSchema.statics.getBestCategory = async function(organizationId, clientId) {
  const mapping = await this.findOne({
    organization: organizationId,
    client: clientId,
    userConfirmed: true,
  }).sort({ confidence: -1, usageCount: -1 });
  
  return mapping?.category || null;
};

// Static method: Update or create mapping
categoryMappingSchema.statics.recordUsage = async function(organizationId, clientId, category, keywords = []) {
  const existing = await this.findOne({
    organization: organizationId,
    client: clientId,
    category,
  });
  
  if (existing) {
    existing.usageCount += 1;
    existing.lastUsed = new Date();
    existing.confidence = Math.min(95, existing.confidence + 5); // Increase confidence
    
    // Merge keywords
    const newKeywords = keywords.filter(k => !existing.keywords.includes(k));
    existing.keywords.push(...newKeywords);
    
    await existing.save();
    return existing;
  } else {
    return await this.create({
      organization: organizationId,
      client: clientId,
      category,
      confidence: 60,
      keywords,
      usageCount: 1,
    });
  }
};

// Static method: Learn from user correction
categoryMappingSchema.statics.learnFromCorrection = async function(
  organizationId, 
  clientId, 
  wrongCategory, 
  correctCategory
) {
  // Decrease confidence in wrong category
  const wrongMapping = await this.findOne({
    organization: organizationId,
    client: clientId,
    category: wrongCategory,
  });
  
  if (wrongMapping) {
    wrongMapping.confidence = Math.max(10, wrongMapping.confidence - 15);
    wrongMapping.userCorrected = true;
    await wrongMapping.save();
  }
  
  // Increase confidence in correct category
  const correctMapping = await this.findOneAndUpdate(
    {
      organization: organizationId,
      client: clientId,
      category: correctCategory,
    },
    {
      $inc: { usageCount: 1, confidence: 10 },
      $set: { 
        userConfirmed: true,
        lastUsed: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  
  return correctMapping;
};

export default mongoose.model('CategoryMapping', categoryMappingSchema);