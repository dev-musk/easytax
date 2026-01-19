// ============================================
// FILE: server/routes/reminders.js
// ✅ FEATURE #2 & #27: Send Payment Reminders
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import { sendInvoiceReminder, testEmailConfig } from '../services/emailService.js';
import { triggerRemindersNow, triggerDailyReportNow } from '../services/scheduler.js';
import { generateDailyReport } from '../services/reportGenerator.js';
import { sendDailyReport } from '../services/emailService.js';

const router = express.Router();

router.use(protect);

// ✅ FEATURE #27: Send manual reminder for specific invoice
router.post('/invoices/:id/send-reminder', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.client || !invoice.client.email) {
      return res.status(400).json({ error: 'Client email not found' });
    }

    const organization = await Organization.findById(organizationId);

    // Send reminder
    const result = await sendInvoiceReminder(invoice, organization, invoice.client);

    // Track reminder
    if (!invoice.remindersSent) {
      invoice.remindersSent = [];
    }
    invoice.remindersSent.push({
      sentAt: new Date(),
      sentTo: invoice.client.email,
      type: 'MANUAL',
      sentBy: req.user.id,
    });
    await invoice.save();

    res.json({
      success: true,
      message: 'Payment reminder sent successfully',
      sentTo: invoice.client.email,
      messageId: result.messageId,
    });

  } catch (error) {
    console.error('❌ Send reminder error:', error);
    res.status(500).json({ 
      error: 'Failed to send reminder', 
      details: error.message 
    });
  }
});

// ✅ Get reminder history for an invoice
router.get('/invoices/:id/reminder-history', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).select('remindersSent');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      reminders: invoice.remindersSent || [],
      count: invoice.remindersSent?.length || 0,
    });

  } catch (error) {
    console.error('Get reminder history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    await testEmailConfig();
    res.json({ 
      success: true, 
      message: 'Email configuration is valid and working' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Email configuration error', 
      details: error.message 
    });
  }
});

// ✅ FEATURE #27: Trigger reminder check manually (admin only)
router.post('/trigger-reminder-check', async (req, res) => {
  try {
    // Run reminder check
    triggerRemindersNow();

    res.json({
      success: true,
      message: 'Reminder check triggered. Check server logs for details.',
    });

  } catch (error) {
    console.error('Trigger reminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FEATURE #31: Generate and send daily report manually
router.post('/send-daily-report', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { email } = req.body; // Optional: override recipient email

    const organization = await Organization.findById(organizationId);
    const reportData = await generateDailyReport(organizationId);

    const recipientEmail = email || organization.ownerEmail || organization.email || req.user.email;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'No recipient email specified' });
    }

    await sendDailyReport(reportData, organization, recipientEmail);

    res.json({
      success: true,
      message: 'Daily report sent successfully',
      sentTo: recipientEmail,
    });

  } catch (error) {
    console.error('Send daily report error:', error);
    res.status(500).json({ 
      error: 'Failed to send daily report', 
      details: error.message 
    });
  }
});

// ✅ FEATURE #31: Trigger all daily reports (admin only)
router.post('/trigger-daily-reports', async (req, res) => {
  try {
    triggerDailyReportNow();

    res.json({
      success: true,
      message: 'Daily report generation triggered. Check server logs for details.',
    });

  } catch (error) {
    console.error('Trigger daily reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ IMPORTANT: Export the router as default
export default router;