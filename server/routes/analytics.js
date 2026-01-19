// ============================================
// FILE: server/routes/analytics.js
// NEW FILE - Analytics Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import AnalyticsService from '../services/analyticsService.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get client profitability
router.get('/client-profitability', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const profitability = await AnalyticsService.getClientProfitability(
      organizationId,
      startDate,
      endDate
    );

    res.json(profitability);
  } catch (error) {
    console.error('Error fetching client profitability:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const analytics = await AnalyticsService.getRevenueAnalytics(
      organizationId,
      startDate,
      endDate
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top clients
router.get('/top-clients', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { limit = 10 } = req.query;

    const topClients = await AnalyticsService.getTopClients(
      organizationId,
      parseInt(limit)
    );

    res.json(topClients);
  } catch (error) {
    console.error('Error fetching top clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product performance
router.get('/product-performance', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const performance = await AnalyticsService.getProductPerformance(
      organizationId,
      startDate,
      endDate
    );

    res.json(performance);
  } catch (error) {
    console.error('Error fetching product performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment trends
router.get('/payment-trends', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { months = 6 } = req.query;

    const trends = await AnalyticsService.getPaymentTrends(
      organizationId,
      parseInt(months)
    );

    res.json(trends);
  } catch (error) {
    console.error('Error fetching payment trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export data to Excel
router.get('/export', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { reportType, startDate, endDate } = req.query;

    const data = await AnalyticsService.exportToExcel(
      organizationId,
      reportType,
      startDate,
      endDate
    );

    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;