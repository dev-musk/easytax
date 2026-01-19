// ============================================
// FILE: server/models/PurchaseOrder.js
// ✅ FEATURE #16: PO Management Module - WITH APPROVED STATUS
// ============================================

import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema({
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
  receivedQuantity: {
    type: Number,
    default: 0,
  },
  balanceQuantity: {
    type: Number,
    required: true,
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
    },
    poDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    
    // Vendor Details
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    
    // PO Details
    items: [poItemSchema],
    
    subtotal: {
      type: Number,
      required: true,
    },
    
    gstAmount: {
      type: Number,
      default: 0,
    },
    
    totalValue: {
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
        'APPROVED',        // ✅ NEW STATUS
        'RECEIVING',       // ✅ NEW STATUS (when GRN is created)
        'PARTIALLY_RECEIVED',
        'RECEIVED',
        'PARTIALLY_PAID',
        'PAID',
        'CANCELLED',
      ],
      default: 'PENDING',
    },
    
    // Approval Details
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    
    // Delivery Details
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveryAddress: String,
    
    // Linked Invoices
    linkedInvoices: [
      {
        invoice: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
        invoiceNumber: String,
        linkedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
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
    
    // Notes & Terms
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
purchaseOrderSchema.index({ organization: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ vendor: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ poDate: 1 });

// Pre-save hook to update status
purchaseOrderSchema.pre('save', function (next) {
  // Calculate balance quantities for items
  this.items.forEach((item) => {
    item.balanceQuantity = item.quantity - item.receivedQuantity;
  });
  
  // Update PO status based on received quantities and payment
  const allReceived = this.items.every((item) => item.receivedQuantity >= item.quantity);
  const someReceived = this.items.some((item) => item.receivedQuantity > 0);
  
  // Don't change status if it's DRAFT, APPROVED, or CANCELLED
  if (['DRAFT', 'CANCELLED'].includes(this.status)) {
    return next();
  }
  
  // If status is APPROVED and goods start arriving, change to RECEIVING
  if (this.status === 'APPROVED' && someReceived) {
    this.status = 'RECEIVING';
  }
  
  // Status progression based on receiving and payment
  if (allReceived && this.balanceAmount === 0) {
    this.status = 'PAID';
  } else if (allReceived && this.balanceAmount > 0) {
    this.status = 'RECEIVED';
  } else if (someReceived && this.paidAmount > 0) {
    this.status = 'PARTIALLY_RECEIVED';
  } else if (someReceived && this.status !== 'RECEIVING') {
    this.status = 'RECEIVING';
  } else if (this.paidAmount > 0 && this.balanceAmount > 0 && !someReceived) {
    this.status = 'PARTIALLY_PAID';
  }
  
  next();
});

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);