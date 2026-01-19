// ============================================
// FILE: server/models/GRN.js
// ✅ FEATURE #46: THREE-WAY MATCHING - Goods Received Note
// ============================================

import mongoose from 'mongoose';

const grnItemSchema = new mongoose.Schema({
  poItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  hsnSacCode: String,
  orderedQuantity: {
    type: Number,
    required: true,
  },
  receivedQuantity: {
    type: Number,
    required: true,
  },
  acceptedQuantity: {
    type: Number,
    required: true,
  },
  rejectedQuantity: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  remarks: String,
  // Quality inspection
  qualityStatus: {
    type: String,
    enum: ['PASSED', 'FAILED', 'PARTIAL', 'PENDING'],
    default: 'PENDING',
  },
  inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  inspectionDate: Date,
});

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
    },
    grnDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    
    // Link to PO
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    poNumber: String,
    
    // Vendor
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    
    // Delivery Details
    deliveryDate: {
      type: Date,
      required: true,
    },
    deliveryLocation: {
      type: String,
      default: 'Main Warehouse',
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Items
    items: [grnItemSchema],
    
    // Status
    status: {
      type: String,
      enum: ['DRAFT', 'RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED', 'PARTIAL'],
      default: 'DRAFT',
    },
    
    // Totals
    totalOrderedQuantity: Number,
    totalReceivedQuantity: Number,
    totalAcceptedQuantity: Number,
    totalRejectedQuantity: Number,
    totalAmount: {
      type: Number,
      required: true,
    },
    
    // Matching Status
    matchingStatus: {
      type: String,
      enum: ['PENDING', 'MATCHED', 'PARTIALLY_MATCHED', 'MISMATCHED'],
      default: 'PENDING',
    },
    
    // Linked Invoice
    linkedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    invoiceNumber: String,
    invoiceMatchDate: Date,
    
    // Discrepancies
    hasDiscrepancies: {
      type: Boolean,
      default: false,
    },
    discrepancies: [{
      type: {
        type: String,
        enum: ['QUANTITY_MISMATCH', 'RATE_MISMATCH', 'ITEM_MISMATCH', 'QUALITY_ISSUE'],
      },
      description: String,
      severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'MEDIUM',
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      resolvedAt: Date,
      resolution: String,
    }],
    
    // Documents
    documents: [{
      type: {
        type: String,
        enum: ['DELIVERY_CHALLAN', 'PACKING_LIST', 'PHOTO', 'INVOICE', 'OTHER'],
      },
      filename: String,
      filepath: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Notes
    notes: String,
    internalNotes: String,
    
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

// Indexes
grnSchema.index({ organization: 1, grnNumber: 1 }, { unique: true });
grnSchema.index({ purchaseOrder: 1 });
grnSchema.index({ vendor: 1 });
grnSchema.index({ status: 1 });

// Pre-save hook to update status
grnSchema.pre('save', function (next) {
  // Calculate totals
  this.totalOrderedQuantity = this.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  this.totalReceivedQuantity = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  this.totalAcceptedQuantity = this.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  this.totalRejectedQuantity = this.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);
  
  // Check if all items inspected
  const allInspected = this.items.every(item => item.qualityStatus !== 'PENDING');
  const allPassed = this.items.every(item => item.qualityStatus === 'PASSED');
  const someFailed = this.items.some(item => item.qualityStatus === 'FAILED');
  
  if (allInspected) {
    this.status = 'INSPECTED';
    if (allPassed) {
      this.status = 'ACCEPTED';
    } else if (someFailed) {
      this.status = 'PARTIAL';
    }
  }
  
  next();
});

export default mongoose.model('GRN', grnSchema);