// ============================================
// FILE: server/models/Role.js
// Complete Role & Permissions System
// ============================================

import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  module: {
    type: String,
    required: true,
    enum: [
      'DASHBOARD',
      'CLIENTS',
      'ITEMS',
      'SALES',
      'QUOTATIONS',
      'TAX_INVOICE',
      'PROFORMA_INVOICE',
      'DELIVERY_CHALLAN',
      'CREDIT_NOTE',
      'DEBIT_NOTE',
      'RECURRING_INVOICES',
      'PURCHASE_ORDERS',
      'PURCHASE_INVOICES',
      'GRN',
      'INVENTORY',
      'PAYMENTS',
      'RECEIPTS',
      'BANKS',
      'CSR',
      'ANALYTICS',
      'REPORTS',
      'GST_REPORTS',
      'OUTSTANDING_REPORTS',
      'VENDOR_OUTSTANDING',
      'AGEING_REPORTS',
      'AUDIT_TRAIL',
      'HSN_CODES',
      'MULTI_GSTIN',
      'TDS_SETTINGS',
      'WHATSAPP_SETTINGS',
      'ORGANIZATION_SETTINGS',
      'USER_MANAGEMENT',
      'ROLE_MANAGEMENT',
    ],
  },
  actions: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
    print: { type: Boolean, default: false },
    share: { type: Boolean, default: false },
    approve: { type: Boolean, default: false },
  },
});

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: String,
    isSystem: {
      type: Boolean,
      default: false, // System roles cannot be deleted
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    permissions: [permissionSchema],
    features: {
      // Special feature access
      canManageUsers: { type: Boolean, default: false },
      canManageRoles: { type: Boolean, default: false },
      canViewAllData: { type: Boolean, default: false },
      canExportData: { type: Boolean, default: false },
      canDeleteRecords: { type: Boolean, default: false },
      canApproveInvoices: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },
      canAccessAPI: { type: Boolean, default: false },
    },
    restrictions: {
      // Data access restrictions
      ownDataOnly: { type: Boolean, default: false },
      departmentDataOnly: { type: Boolean, default: false },
      maxInvoiceAmount: Number,
      maxDiscountPercent: Number,
      requiresApproval: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
roleSchema.index({ organization: 1, name: 1 }, { unique: true });
roleSchema.index({ organization: 1, isActive: 1 });

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function (module, action) {
  const permission = this.permissions.find((p) => p.module === module);
  return permission?.actions[action] || false;
};

// Method to check if role can access module
roleSchema.methods.canAccessModule = function (module) {
  const permission = this.permissions.find((p) => p.module === module);
  return permission?.actions.read || false;
};

export default mongoose.model('Role', roleSchema);