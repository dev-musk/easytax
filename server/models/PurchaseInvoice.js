// ============================================
// FILE: server/models/PurchaseInvoice.js
// Purchase Invoice Model (Bills FROM Vendors)
// ============================================

import mongoose from 'mongoose';

const piItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  hsnSacCode: String,
  quantity: {
    type: Number,
    required: true,
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
  gstRate: {
    type: Number,
    default: 18,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
});

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    piNumber: {
      type: String,
      required: true,
    },
    
    // Vendor Details
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    
    // Link to Purchase Order (optional but recommended)
    linkedPO: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    
    // Invoice Dates
    piDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    
    dueDate: {
      type: Date,
      required: true,
    },
    
    // Items
    items: [piItemSchema],
    
    // Amount Details
    subtotal: {
      type: Number,
      required: true,
    },
    
    gstAmount: {
      type: Number,
      default: 0,
    },
    
    totalAmount: {
      type: Number,
      required: true,
    },
    
    // Payment Tracking
    paidAmount: {
      type: Number,
      default: 0,
    },
    
    balanceAmount: {
      type: Number,
      required: true,
    },
    
    // Status
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING',
        'APPROVED',
        'PARTIALLY_PAID',
        'PAID',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'DRAFT',
    },
    
    // Approval Details
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    
    // Rejection Details
    rejectionReason: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    
    // Payment Records
    payments: [
      {
        amount: Number,
        paymentDate: Date,
        paymentMode: String,
        referenceNumber: String,
        notes: String,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    
    // Notes & Metadata
    vendorReferenceNumber: String, // Invoice number from vendor
    notes: String,
    termsConditions: String,
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes
purchaseInvoiceSchema.index({ organization: 1, piNumber: 1 }, { unique: true });
purchaseInvoiceSchema.index({ vendor: 1 });
purchaseInvoiceSchema.index({ status: 1 });
purchaseInvoiceSchema.index({ piDate: 1 });
purchaseInvoiceSchema.index({ linkedPO: 1 });

// Pre-save hook to calculate amounts
purchaseInvoiceSchema.pre('save', function (next) {
  // Recalculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate GST for each item
  this.items.forEach((item) => {
    item.gstAmount = (item.amount * item.gstRate) / 100;
  });
  
  // Calculate total GST
  this.gstAmount = this.items.reduce((sum, item) => sum + item.gstAmount, 0);
  
  // Calculate total amount
  this.totalAmount = this.subtotal + this.gstAmount;
  
  // Update balance amount
  this.balanceAmount = this.totalAmount - (this.paidAmount || 0);
  
  next();
});

export default mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);