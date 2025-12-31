// ============================================
// FILE: server/routes/dashboard.js
// Dashboard Statistics Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';

const router = express.Router();

router.use(protect);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total invoices
    const totalInvoices = await Invoice.countDocuments({ organization: organizationId });

    // Total clients
    const totalClients = await Client.countDocuments({ organization: organizationId });

    // Outstanding amount (PENDING + PARTIALLY_PAID invoices)
    const outstandingInvoices = await Invoice.find({
      organization: organizationId,
      status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
    });
    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.balanceAmount || inv.totalAmount),
      0
    );

    // Overdue invoices (dueDate < today and status != PAID)
    const overdueInvoices = await Invoice.countDocuments({
      organization: organizationId,
      dueDate: { $lt: today },
      status: { $ne: 'PAID' },
    });

    // This month's revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthlyInvoices = await Invoice.find({
      organization: organizationId,
      invoiceDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Recent invoices
    const recentInvoices = await Invoice.find({ organization: organizationId })
      .populate('client', 'companyName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber invoiceDate totalAmount status client');

    // Recent payments
    const recentPayments = await Payment.find({ organization: organizationId })
      .populate('invoice', 'invoiceNumber')
      .populate('client', 'companyName')
      .sort({ paymentDate: -1 })
      .limit(5);

    // Monthly revenue trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      const invoices = await Invoice.find({
        organization: organizationId,
        invoiceDate: { $gte: monthStart, $lte: monthEnd },
      });
      
      const revenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        revenue: revenue,
      });
    }

    res.json({
      totalInvoices,
      totalClients,
      outstandingAmount: parseFloat(outstandingAmount.toFixed(2)),
      overdueInvoices,
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      recentInvoices,
      recentPayments,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment collection stats
router.get('/payment-stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Total collected
    const payments = await Payment.find({ organization: organizationId });
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    // Collection by payment mode
    const paymentModes = {};
    payments.forEach((payment) => {
      const mode = payment.paymentMode || 'OTHER';
      paymentModes[mode] = (paymentModes[mode] || 0) + payment.amount;
    });

    // This month's collections
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyPayments = await Payment.find({
      organization: organizationId,
      paymentDate: { $gte: firstDayOfMonth },
    });
    const monthlyCollections = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalCollected: parseFloat(totalCollected.toFixed(2)),
      monthlyCollections: parseFloat(monthlyCollections.toFixed(2)),
      paymentModes: Object.entries(paymentModes).map(([mode, amount]) => ({
        mode,
        amount: parseFloat(amount.toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top clients by revenue
router.get('/top-clients', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { limit = 5 } = req.query;

    const invoices = await Invoice.find({ organization: organizationId }).populate('client');

    // Group by client
    const clientRevenue = {};
    invoices.forEach((invoice) => {
      if (invoice.client) {
        const clientId = invoice.client._id.toString();
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = {
            client: invoice.client,
            revenue: 0,
            invoiceCount: 0,
          };
        }
        clientRevenue[clientId].revenue += invoice.totalAmount;
        clientRevenue[clientId].invoiceCount += 1;
      }
    });

    // Sort and limit
    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit))
      .map((item) => ({
        clientId: item.client._id,
        companyName: item.client.companyName,
        revenue: parseFloat(item.revenue.toFixed(2)),
        invoiceCount: item.invoiceCount,
      }));

    res.json(topClients);
  } catch (error) {
    console.error('Error fetching top clients:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;