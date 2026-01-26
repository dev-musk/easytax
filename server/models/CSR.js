// ============================================
// FILE: server/models/CSR.js - FIXED PRE-SAVE HOOK
// ============================================

import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
    default: "PENDING",
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  notes: String,
});

const feedbackSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const csrSchema = new mongoose.Schema(
  {
    csrNumber: {
      type: String,
      required: true,
      unique: true,
    },
    serviceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceOrder",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    serviceType: {
      type: String,
      enum: [
        "INSTALLATION",
        "MAINTENANCE",
        "REPAIR",
        "INSPECTION",
        "CONSULTATION",
        "SUPPORT",
        "TRAINING",
        "OTHER",
      ],
      required: true,
    },
    serviceDescription: String,
    scopeOfWork: String,
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    technicianName: String,
    technicianPhone: String,
    serviceLocation: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    serviceStartDate: {
      type: Date,
      required: true,
    },
    serviceEndDate: {
      type: Date,
      required: true,
    },
    serviceHours: Number,
    totalServiceDays: Number,
    deliveryChallan: {
      dcNumber: String,
      dcDate: Date,
      linkedAt: Date,
    },
    partsUsed: [
      {
        partName: String,
        partCode: String,
        quantity: Number,
        rate: Number,
        amount: Number,
        warranty: String,
      },
    ],
    // ✅ CRITICAL: Task Checklist Array
    taskChecklist: [taskSchema],
    
    // ✅ THIS IS THE KEY FIELD - Must be calculated correctly
    checklistCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    clientFeedback: [feedbackSchema],
    clientOverallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    internalFeedback: [feedbackSchema],
    approvalStatus: {
      type: String,
      enum: [
        "PENDING",
        "WAITING_CLIENT_APPROVAL",
        "APPROVED_BY_CLIENT",
        "APPROVED_BY_MANAGER",
        "REJECTED",
        "READY_FOR_INVOICE",
      ],
      default: "PENDING",
    },
    approvalChain: [
      {
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        approverRole: String,
        approvalDate: Date,
        comments: String,
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
        },
      },
    ],
    invoiceGenerated: {
      type: Boolean,
      default: false,
    },
    linkedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    invoiceNumber: String,
    invoiceGeneratedDate: Date,
    labourCost: {
      type: Number,
      default: 0,
    },
    materialsCost: {
      type: Number,
      default: 0,
    },
    travelCost: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "IN_PROGRESS",
        "COMPLETED",
        "PENDING_APPROVAL",
        "APPROVED",
        "INVOICED",
        "CANCELLED",
      ],
      default: "IN_PROGRESS",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        filepath: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
csrSchema.index({ organization: 1, csrNumber: 1 }, { unique: true });
csrSchema.index({ client: 1 });
csrSchema.index({ status: 1 });
csrSchema.index({ approvalStatus: 1 });
csrSchema.index({ invoiceGenerated: 1 });

// ✅✅✅ FIXED PRE-SAVE HOOK ✅✅✅
// This hook runs BEFORE saving to database
csrSchema.pre("save", function (next) {
  // ============================================
  // 1. Calculate Total Cost
  // ============================================
  this.totalCost =
    (this.labourCost || 0) + (this.materialsCost || 0) + (this.travelCost || 0);

  // ============================================
  // 2. Calculate Checklist Completion Percentage
  // ============================================
  if (this.taskChecklist && this.taskChecklist.length > 0) {
    // Count completed tasks
    const completedTasks = this.taskChecklist.filter(
      (task) => task.status === "COMPLETED"
    ).length;

    // Total tasks
    const totalTasks = this.taskChecklist.length;

    // Calculate percentage
    this.checklistCompletionPercentage = Math.round(
      (completedTasks / totalTasks) * 100
    );

    // ✅ Debug logging
    console.log(`📊 CSR ${this.csrNumber}:`);
    console.log(`   Completed: ${completedTasks}/${totalTasks}`);
    console.log(`   Percentage: ${this.checklistCompletionPercentage}%`);
  } else {
    // No tasks = 0%
    this.checklistCompletionPercentage = 0;
  }

  next();
});

export default mongoose.model("CSR", csrSchema);

/* 
✅ HOW THIS WORKS:

1. When CSR is saved (created or updated):
   - Pre-save hook automatically runs
   - Counts tasks with status === "COMPLETED"
   - Divides by total tasks
   - Multiplies by 100 to get percentage
   - Stores in checklistCompletionPercentage field

2. Example:
   - taskChecklist: [
       { status: "COMPLETED" }, ✅
       { status: "COMPLETED" }, ✅
       { status: "PENDING" }    ❌
     ]
   - Calculation: (2 / 3) * 100 = 66.66... → rounds to 67%
   - Stored: checklistCompletionPercentage = 67

3. When you fetch CSR:
   - Database returns checklistCompletionPercentage value
   - UI displays it in progress bar
   - Shows "67%" next to progress bar

4. Debug logs:
   - Server console shows:
     📊 CSR-2026-0001:
        Completed: 2/3
        Percentage: 67%
*/