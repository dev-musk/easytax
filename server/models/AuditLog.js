// ============================================
// FILE: server/models/AuditLog.js
// ✅ CRITICAL: Audit Trail System (Section 128 Compliance)
// PERMANENT, UNALTERABLE LOGGING OF ALL TRANSACTIONS
// ============================================

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // Entity Information
    entityType: {
      type: String,
      enum: ['INVOICE', 'PAYMENT', 'CLIENT', 'PRODUCT', 'PURCHASE_ORDER', 'QUOTATION', 'ORGANIZATION', 'USER'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityNumber: {
      type: String, // Invoice number, PO number, etc.
      trim: true,
    },

    // Action Details
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'CANCEL', 'PAYMENT', 'STATUS_CHANGE'],
      required: true,
      index: true,
    },
    
    // User Information (CANNOT BE NULL)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userIpAddress: {
      type: String,
      default: 'N/A',
    },

    // Change Details
    changes: [{
      field: {
        type: String,
        required: true,
      },
      oldValue: {
        type: mongoose.Schema.Types.Mixed, // Can store any type
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed,
      },
      dataType: {
        type: String,
        enum: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'ARRAY'],
      },
    }],

    // Snapshot of entire document (for critical entities)
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Metadata
    description: {
      type: String,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },

    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Timestamp (IMMUTABLE)
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Cannot be changed after creation
      index: true,
    },

    // Financial Year
    financialYear: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt, no updates allowed
    strict: true, // Prevent field additions
  }
);

// ============================================
// INDEXES FOR FAST QUERIES
// ============================================
auditLogSchema.index({ organization: 1, timestamp: -1 });
auditLogSchema.index({ organization: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ organization: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ organization: 1, financialYear: 1 });
auditLogSchema.index({ entityNumber: 1 });

// ============================================
// PREVENT UPDATES AND DELETIONS (IMMUTABLE)
// ============================================
auditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be modified. This is a legal requirement under Section 128.'));
});

auditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be modified. This is a legal requirement under Section 128.'));
});

auditLogSchema.pre('deleteOne', function(next) {
  next(new Error('Audit logs cannot be deleted. This is a legal requirement under Section 128.'));
});

auditLogSchema.pre('deleteMany', function(next) {
  next(new Error('Audit logs cannot be deleted. This is a legal requirement under Section 128.'));
});

// ============================================
// STATIC METHODS
// ============================================

// Log any change to an entity
auditLogSchema.statics.logChange = async function(data) {
  const {
    entityType,
    entityId,
    entityNumber,
    action,
    userId,
    userName,
    userEmail,
    userIpAddress,
    changes,
    beforeSnapshot,
    afterSnapshot,
    description,
    severity,
    organization,
  } = data;

  // Calculate financial year (April to March)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const financialYear = currentMonth >= 3 
    ? `FY${currentYear}-${currentYear + 1}`
    : `FY${currentYear - 1}-${currentYear}`;

  return await this.create({
    entityType,
    entityId,
    entityNumber,
    action,
    userId,
    userName,
    userEmail,
    userIpAddress: userIpAddress || 'N/A',
    changes: changes || [],
    beforeSnapshot,
    afterSnapshot,
    description,
    severity: severity || 'LOW',
    organization,
    financialYear,
  });
};

// Get audit trail for a specific entity
auditLogSchema.statics.getEntityHistory = async function(entityType, entityId, organizationId) {
  return await this.find({
    entityType,
    entityId,
    organization: organizationId,
  })
    .sort({ timestamp: -1 })
    .populate('userId', 'name email')
    .limit(100); // Last 100 changes
};

// Get recent activity for an organization
auditLogSchema.statics.getRecentActivity = async function(organizationId, limit = 50) {
  return await this.find({ organization: organizationId })
    .sort({ timestamp: -1 })
    .populate('userId', 'name email')
    .limit(limit);
};

// Get user activity log
auditLogSchema.statics.getUserActivity = async function(userId, organizationId, startDate, endDate) {
  const query = {
    userId,
    organization: organizationId,
  };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return await this.find(query)
    .sort({ timestamp: -1 })
    .limit(1000);
};

// Generate audit report for compliance
auditLogSchema.statics.generateComplianceReport = async function(organizationId, financialYear) {
  const query = { organization: organizationId };
  if (financialYear) query.financialYear = financialYear;

  const summary = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          entityType: '$entityType',
          action: '$action',
        },
        count: { $sum: 1 },
        users: { $addToSet: '$userName' },
      },
    },
    {
      $group: {
        _id: '$_id.entityType',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            users: '$users',
          },
        },
        totalChanges: { $sum: '$count' },
      },
    },
  ]);

  return summary;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;