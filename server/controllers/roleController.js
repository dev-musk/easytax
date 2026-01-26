// ============================================
// FILE: server/controllers/roleController.js
// Complete CRUD for Roles & Permissions
// ============================================

import Role from '../models/Role.js';
import User from '../models/User.js';

// Get all roles for organization
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({
      organization: req.user.organizationId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Get single role
export const getRole = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
};

// Create new role
export const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions, features, restrictions } = req.body;

    // Check if role name already exists
    const existing = await Role.findOne({
      organization: req.user.organizationId,
      name: name.toUpperCase(),
    });

    if (existing) {
      return res.status(400).json({ error: 'Role name already exists' });
    }

    const role = await Role.create({
      name: name.toUpperCase(),
      displayName,
      description,
      organization: req.user.organizationId,
      permissions: permissions || [],
      features: features || {},
      restrictions: restrictions || {},
    });

    res.status(201).json({ role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { displayName, description, permissions, features, restrictions, isActive } = req.body;

    const role = await Role.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent editing system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot edit system roles' });
    }

    // Update fields
    if (displayName) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (features) role.features = { ...role.features, ...features };
    if (restrictions) role.restrictions = { ...role.restrictions, ...restrictions };
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    res.json({ role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        error: `Cannot delete role. ${usersWithRole} user(s) assigned to this role.`,
      });
    }

    await role.deleteOne();

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};

// Clone role
export const cloneRole = async (req, res) => {
  try {
    const sourceRole = await Role.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    });

    if (!sourceRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const { name, displayName } = req.body;

    const newRole = await Role.create({
      name: name.toUpperCase(),
      displayName,
      description: `Cloned from ${sourceRole.displayName}`,
      organization: req.user.organizationId,
      permissions: sourceRole.permissions,
      features: sourceRole.features,
      restrictions: sourceRole.restrictions,
    });

    res.status(201).json({ role: newRole });
  } catch (error) {
    console.error('Clone role error:', error);
    res.status(500).json({ error: 'Failed to clone role' });
  }
};

// Get role statistics
export const getRoleStats = async (req, res) => {
  try {
    const roles = await Role.find({
      organization: req.user.organizationId,
      isActive: true,
    });

    const stats = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id });
        return {
          roleId: role._id,
          roleName: role.displayName,
          userCount,
          isSystem: role.isSystem,
        };
      })
    );

    res.json({ stats });
  } catch (error) {
    console.error('Get role stats error:', error);
    res.status(500).json({ error: 'Failed to fetch role statistics' });
  }
};

// Initialize default roles for organization
export const initializeDefaultRoles = async (organizationId) => {
  try {
    const defaultRoles = [
      {
        name: 'OWNER',
        displayName: 'Owner',
        description: 'Full system access with all permissions',
        isSystem: true,
        organization: organizationId,
        permissions: getAllModulesWithFullPermissions(),
        features: {
          canManageUsers: true,
          canManageRoles: true,
          canViewAllData: true,
          canExportData: true,
          canDeleteRecords: true,
          canApproveInvoices: true,
          canManageSettings: true,
          canAccessAPI: true,
        },
        restrictions: {
          ownDataOnly: false,
          departmentDataOnly: false,
          requiresApproval: false,
        },
      },
      {
        name: 'ADMIN',
        displayName: 'Administrator',
        description: 'Administrative access with most permissions',
        isSystem: true,
        organization: organizationId,
        permissions: getAllModulesWithFullPermissions(),
        features: {
          canManageUsers: true,
          canManageRoles: false,
          canViewAllData: true,
          canExportData: true,
          canDeleteRecords: true,
          canApproveInvoices: true,
          canManageSettings: false,
          canAccessAPI: false,
        },
        restrictions: {
          ownDataOnly: false,
          departmentDataOnly: false,
          requiresApproval: false,
        },
      },
      {
        name: 'ACCOUNTANT',
        displayName: 'Accountant',
        description: 'Financial operations and reporting access',
        isSystem: true,
        organization: organizationId,
        permissions: getAccountantPermissions(),
        features: {
          canManageUsers: false,
          canManageRoles: false,
          canViewAllData: true,
          canExportData: true,
          canDeleteRecords: false,
          canApproveInvoices: true,
          canManageSettings: false,
          canAccessAPI: false,
        },
        restrictions: {
          ownDataOnly: false,
          departmentDataOnly: false,
          requiresApproval: false,
        },
      },
      {
        name: 'USER',
        displayName: 'Standard User',
        description: 'Basic access for day-to-day operations',
        isSystem: true,
        organization: organizationId,
        permissions: getStandardUserPermissions(),
        features: {
          canManageUsers: false,
          canManageRoles: false,
          canViewAllData: false,
          canExportData: false,
          canDeleteRecords: false,
          canApproveInvoices: false,
          canManageSettings: false,
          canAccessAPI: false,
        },
        restrictions: {
          ownDataOnly: true,
          departmentDataOnly: false,
          requiresApproval: true,
        },
      },
    ];

    await Role.insertMany(defaultRoles);
    console.log('✅ Default roles initialized for organization:', organizationId);
  } catch (error) {
    console.error('Failed to initialize default roles:', error);
  }
};

// Helper functions for permissions
function getAllModulesWithFullPermissions() {
  const modules = [
    'DASHBOARD', 'CLIENTS', 'ITEMS', 'SALES', 'QUOTATIONS', 'TAX_INVOICE',
    'PROFORMA_INVOICE', 'DELIVERY_CHALLAN', 'CREDIT_NOTE', 'DEBIT_NOTE',
    'RECURRING_INVOICES', 'PURCHASE_ORDERS', 'PURCHASE_INVOICES', 'GRN',
    'INVENTORY', 'PAYMENTS', 'RECEIPTS', 'BANKS', 'CSR', 'ANALYTICS',
    'REPORTS', 'GST_REPORTS', 'OUTSTANDING_REPORTS', 'VENDOR_OUTSTANDING',
    'AGEING_REPORTS', 'AUDIT_TRAIL', 'HSN_CODES', 'MULTI_GSTIN',
    'TDS_SETTINGS', 'WHATSAPP_SETTINGS', 'ORGANIZATION_SETTINGS',
    'USER_MANAGEMENT', 'ROLE_MANAGEMENT',
  ];

  return modules.map((module) => ({
    module,
    actions: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      print: true,
      share: true,
      approve: true,
    },
  }));
}

function getAccountantPermissions() {
  const fullAccess = [
    'DASHBOARD', 'CLIENTS', 'ITEMS', 'TAX_INVOICE', 'PROFORMA_INVOICE',
    'CREDIT_NOTE', 'DEBIT_NOTE', 'PURCHASE_INVOICES', 'PAYMENTS', 'RECEIPTS',
    'BANKS', 'ANALYTICS', 'REPORTS', 'GST_REPORTS', 'OUTSTANDING_REPORTS',
    'VENDOR_OUTSTANDING', 'AGEING_REPORTS', 'TDS_SETTINGS',
  ];

  const readOnly = ['AUDIT_TRAIL', 'HSN_CODES', 'MULTI_GSTIN'];

  return [
    ...fullAccess.map((module) => ({
      module,
      actions: {
        create: true,
        read: true,
        update: true,
        delete: false,
        export: true,
        print: true,
        share: true,
        approve: true,
      },
    })),
    ...readOnly.map((module) => ({
      module,
      actions: {
        create: false,
        read: true,
        update: false,
        delete: false,
        export: true,
        print: true,
        share: false,
        approve: false,
      },
    })),
  ];
}

function getStandardUserPermissions() {
  const modules = [
    'DASHBOARD', 'CLIENTS', 'ITEMS', 'QUOTATIONS', 'TAX_INVOICE',
    'DELIVERY_CHALLAN', 'INVENTORY',
  ];

  return modules.map((module) => ({
    module,
    actions: {
      create: true,
      read: true,
      update: true,
      delete: false,
      export: false,
      print: true,
      share: false,
      approve: false,
    },
  }));
}