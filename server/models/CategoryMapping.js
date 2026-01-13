import mongoose from 'mongoose';

const categoryMappingSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    gstRate: {
      type: Number,
      default: 18,
    },
    tdsSection: {
      type: String,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 1,
      index: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

categoryMappingSchema.index({ organization: 1, vendorName: 1, category: 1 }, { unique: true });
categoryMappingSchema.index({ organization: 1, usageCount: -1 });
categoryMappingSchema.index({ organization: 1, lastUsed: -1 });

categoryMappingSchema.methods.calculateConfidence = function () {
  const baseConfidence = Math.min(50 + this.usageCount * 5, 95);
  const daysSinceLastUse = (Date.now() - this.lastUsed) / (1000 * 60 * 60 * 24);
  const recencyBoost = daysSinceLastUse < 30 ? 5 : 0;
  this.confidence = Math.min(baseConfidence + recencyBoost, 100);
  return this.confidence;
};

categoryMappingSchema.statics.findMostUsedForVendor = async function (
  organizationId,
  vendorName
) {
  return this.findOne({
    organization: organizationId,
    vendorName: { $regex: vendorName, $options: 'i' },
    isActive: true,
  })
    .sort({ usageCount: -1, lastUsed: -1 })
    .limit(1);
};

categoryMappingSchema.statics.getTopCategories = async function (
  organizationId,
  limit = 10
) {
  return this.aggregate([
    {
      $match: {
        organization: mongoose.Types.ObjectId(organizationId),
        isActive: true,
      },
    },
    {
      $group: {
        _id: '$category',
        totalUsage: { $sum: '$usageCount' },
        uniqueVendors: { $addToSet: '$vendorName' },
        avgGstRate: { $avg: '$gstRate' },
        lastUsed: { $max: '$lastUsed' },
      },
    },
    {
      $sort: { totalUsage: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        category: '$_id',
        totalUsage: 1,
        vendorCount: { $size: '$uniqueVendors' },
        avgGstRate: { $round: ['$avgGstRate', 0] },
        lastUsed: 1,
      },
    },
  ]);
};

categoryMappingSchema.pre('save', function (next) {
  if (this.isModified('usageCount') || this.isModified('lastUsed')) {
    this.calculateConfidence();
  }
  next();
});

export default mongoose.model('CategoryMapping', categoryMappingSchema);