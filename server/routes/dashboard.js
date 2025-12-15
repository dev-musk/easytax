
// ============================================
// FILE: server/routes/dashboard.js
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

router.use(protect);

router.get('/stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date();

    const [
      totalInvoices,
      totalClients,
      outstandingInvoices,
      overdueInvoices,
    ] = await Promise.all([
      Invoice.countDocuments({ organization: organizationId }),
      Client.countDocuments({ organization: organizationId, isActive: true }),
      Invoice.aggregate([
        {
          $match: {
            organization: organizationId,
            status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$balanceAmount' },
          },
        },
      ]),
      Invoice.countDocuments({
        organization: organizationId,
        status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { $lt: today },
      }),
    ]);

    res.json({
      totalInvoices,
      totalClients,
      outstandingAmount: outstandingInvoices[0]?.total || 0,
      overdueInvoices,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;