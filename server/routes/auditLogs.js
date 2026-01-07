// ============================================
// FILE: server/routes/auditLogs.js
// ✅ AUDIT TRAIL API ROUTES
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Apply auth middleware
router.use(protect);

// ============================================
// GET: Recent activity for organization
// ============================================
router.get('/recent', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { limit = 50 } = req.query;

    const logs = await AuditLog.getRecentActivity(organizationId, parseInt(limit));

    res.json(logs);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: Entity history (all changes to a specific record)
// ============================================
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const organizationId = req.user.organizationId;

    const history = await AuditLog.getEntityHistory(
      entityType.toUpperCase(),
      entityId,
      organizationId
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching entity history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: User activity log
// ============================================
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organizationId;

    const logs = await AuditLog.getUserActivity(
      userId,
      organizationId,
      startDate,
      endDate
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: Advanced search/filter
// ============================================
router.get('/search', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const {
      entityType,
      action,
      userId,
      startDate,
      endDate,
      entityNumber,
      severity,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { organization: organizationId };

    if (entityType) query.entityType = entityType.toUpperCase();
    if (action) query.action = action.toUpperCase();
    if (userId) query.userId = userId;
    if (entityNumber) query.entityNumber = { $regex: entityNumber, $options: 'i' };
    if (severity) query.severity = severity.toUpperCase();

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email'),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: Compliance report
// ============================================
router.get('/compliance-report', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { financialYear } = req.query;

    const report = await AuditLog.generateComplianceReport(
      organizationId,
      financialYear
    );

    res.json({
      financialYear: financialYear || 'All Years',
      summary: report,
      generatedAt: new Date(),
      generatedBy: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: Statistics
// ============================================
router.get('/statistics', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const query = { organization: organizationId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: query },
      {
        $facet: {
          byEntityType: [
            {
              $group: {
                _id: '$entityType',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          byAction: [
            {
              $group: {
                _id: '$action',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          byUser: [
            {
              $group: {
                _id: { userId: '$userId', userName: '$userName' },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          bySeverity: [
            {
              $group: {
                _id: '$severity',
                count: { $sum: 1 },
              },
            },
          ],
          totalChanges: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      statistics: stats[0],
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Now',
      },
    });
  } catch (error) {
    console.error('Error generating statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET: Export audit logs (CSV)
// ============================================
router.get('/export', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate, entityType } = req.query;

    const query = { organization: organizationId };

    if (entityType) query.entityType = entityType.toUpperCase();

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .limit(10000); // Max 10k records

    // Convert to CSV format
    const csvRows = [
      'Timestamp,Entity Type,Entity Number,Action,User,Email,IP Address,Severity,Description',
    ];

    logs.forEach((log) => {
      const row = [
        log.timestamp.toISOString(),
        log.entityType,
        log.entityNumber || 'N/A',
        log.action,
        log.userName,
        log.userEmail,
        log.userIpAddress,
        log.severity,
        log.description ? `"${log.description.replace(/"/g, '""')}"` : '',
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-log-${Date.now()}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;