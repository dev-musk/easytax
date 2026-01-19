// ============================================
// FILE: server/middleware/auditMiddleware.js
// ✅ AUTOMATIC AUDIT TRAIL LOGGING MIDDLEWARE
// ============================================

import AuditLog from '../models/AuditLog.js';

// ============================================
// HELPER: Calculate changes between objects
// ============================================
function calculateChanges(oldDoc, newDoc, excludeFields = []) {
  const changes = [];
  const fieldsToExclude = ['__v', 'updatedAt', 'createdAt', '_id', ...excludeFields];

  if (!oldDoc || !newDoc) return changes;

  // Convert to plain objects
  const oldObj = oldDoc.toObject ? oldDoc.toObject() : oldDoc;
  const newObj = newDoc.toObject ? newDoc.toObject() : newDoc;

  // Get all unique keys
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    if (fieldsToExclude.includes(key)) return;

    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

    let dataType = 'STRING';
    if (typeof newValue === 'number') dataType = 'NUMBER';
    else if (typeof newValue === 'boolean') dataType = 'BOOLEAN';
    else if (newValue instanceof Date) dataType = 'DATE';
    else if (Array.isArray(newValue)) dataType = 'ARRAY';
    else if (typeof newValue === 'object' && newValue !== null) dataType = 'OBJECT';

    changes.push({
      field: key,
      oldValue: oldValue,
      newValue: newValue,
      dataType,
    });
  });

  return changes;
}

// ============================================
// HELPER: Get data type for change detection
// ============================================
function getDataType(value) {
  if (typeof value === 'number') return 'NUMBER';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (value instanceof Date) return 'DATE';
  if (Array.isArray(value)) return 'ARRAY';
  if (typeof value === 'object' && value !== null) return 'OBJECT';
  return 'STRING';
}

// ============================================
// MIDDLEWARE: Audit CREATE actions
// ============================================
export const auditCreate = (entityType, getEntityNumber) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    res.send = function(data) {
      // Only log successful creations (status 201)
      if (res.statusCode === 201) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Log asynchronously (don't block response)
          setImmediate(async () => {
            try {
              await AuditLog.logChange({
                entityType,
                entityId: responseData._id,
                entityNumber: getEntityNumber ? getEntityNumber(responseData) : responseData.invoiceNumber || responseData.number || 'N/A',
                action: 'CREATE',
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                userIpAddress: req.ip || req.connection.remoteAddress,
                beforeSnapshot: null,
                afterSnapshot: responseData,
                description: `Created new ${entityType}`,
                severity: 'MEDIUM',
                organization: req.user.organizationId,
              });
            } catch (error) {
              console.error('Audit log error:', error);
            }
          });
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

// ============================================
// MIDDLEWARE: Audit UPDATE actions
// ============================================
export const auditUpdate = (entityType, Model, getEntityNumber) => {
  return async (req, res, next) => {
    try {
      const entityId = req.params.id;

      // Fetch document BEFORE update
      const beforeDoc = await Model.findById(entityId);

      if (!beforeDoc) {
        return next(); // Document not found, continue
      }

      // Store original send
      const originalSend = res.send;

      res.send = function(data) {
        // Only log successful updates (status 200)
        if (res.statusCode === 200) {
          try {
            const afterDoc = typeof data === 'string' ? JSON.parse(data) : data;

            // Calculate changes
            const changes = calculateChanges(beforeDoc, afterDoc);

            if (changes.length > 0) {
              // Log asynchronously
              setImmediate(async () => {
                try {
                  await AuditLog.logChange({
                    entityType,
                    entityId: beforeDoc._id,
                    entityNumber: getEntityNumber ? getEntityNumber(beforeDoc) : beforeDoc.invoiceNumber || beforeDoc.number || 'N/A',
                    action: 'UPDATE',
                    userId: req.user.id,
                    userName: req.user.name,
                    userEmail: req.user.email,
                    userIpAddress: req.ip || req.connection.remoteAddress,
                    changes,
                    beforeSnapshot: beforeDoc.toObject(),
                    afterSnapshot: afterDoc,
                    description: `Updated ${entityType} - ${changes.length} field(s) changed`,
                    severity: 'MEDIUM',
                    organization: req.user.organizationId,
                  });
                } catch (error) {
                  console.error('Audit log error:', error);
                }
              });
            }
          } catch (error) {
            console.error('Audit logging failed:', error);
          }
        }

        // Call original send
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next(); // Continue even if audit fails
    }
  };
};

// ============================================
// MIDDLEWARE: Audit DELETE actions
// ============================================
export const auditDelete = (entityType, Model, getEntityNumber) => {
  return async (req, res, next) => {
    try {
      const entityId = req.params.id;

      // Fetch document BEFORE deletion
      const beforeDoc = await Model.findById(entityId);

      if (!beforeDoc) {
        return next(); // Document not found, continue
      }

      // Store original send
      const originalSend = res.send;

      res.send = function(data) {
        // Only log successful deletions (status 200)
        if (res.statusCode === 200) {
          // Log asynchronously
          setImmediate(async () => {
            try {
              await AuditLog.logChange({
                entityType,
                entityId: beforeDoc._id,
                entityNumber: getEntityNumber ? getEntityNumber(beforeDoc) : beforeDoc.invoiceNumber || beforeDoc.number || 'N/A',
                action: 'DELETE',
                userId: req.user.id,
                userName: req.user.name,
                userEmail: req.user.email,
                userIpAddress: req.ip || req.connection.remoteAddress,
                beforeSnapshot: beforeDoc.toObject(),
                afterSnapshot: null,
                description: `Deleted ${entityType}`,
                severity: 'HIGH',
                organization: req.user.organizationId,
              });
            } catch (error) {
              console.error('Audit log error:', error);
            }
          });
        }

        // Call original send
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next(); // Continue even if audit fails
    }
  };
};

// ============================================
// HELPER: Manual audit logging
// ============================================
export const logManualAudit = async (data) => {
  try {
    return await AuditLog.logChange(data);
  } catch (error) {
    console.error('Manual audit log error:', error);
    throw error;
  }
};

export default {
  auditCreate,
  auditUpdate,
  auditDelete,
  logManualAudit,
};