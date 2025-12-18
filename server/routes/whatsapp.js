// ============================================
// FILE: server/routes/whatsapp.js
// NEW FILE - WhatsApp Configuration Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import WhatsAppConfig from '../models/WhatsAppConfig.js';
import WhatsAppService from '../services/whatsappService.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get WhatsApp configuration
router.get('/config', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    let config = await WhatsAppConfig.findOne({
      organization: organizationId,
    });

    // Create default config if not exists
    if (!config) {
      config = await WhatsAppConfig.create({
        organization: organizationId,
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update WhatsApp configuration
router.put('/config', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    let config = await WhatsAppConfig.findOne({
      organization: organizationId,
    });

    if (!config) {
      config = await WhatsAppConfig.create({
        ...req.body,
        organization: organizationId,
      });
    } else {
      Object.assign(config, req.body);
      await config.save();
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test WhatsApp message
router.post('/test', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await WhatsAppService.sendMessage(
      organizationId,
      phoneNumber,
      message
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send invoice via WhatsApp
router.post('/send-invoice/:invoiceId', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId } = req.params;

    const Invoice = (await import('../models/Invoice.js')).default;
    const Client = (await import('../models/Client.js')).default;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const client = await Client.findById(invoice.client);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const config = await WhatsAppConfig.findOne({
      organization: organizationId,
      isActive: true,
    });

    if (!config) {
      return res.status(400).json({ error: 'WhatsApp not configured' });
    }

    const result = await WhatsAppService.sendInvoiceNotification(
      invoice,
      client,
      config
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;