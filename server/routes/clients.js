// ============================================
// FILE: server/routes/clients.js
// ✅ FIXED: Archive endpoints working properly
// ============================================

import express from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} from '../controllers/clientController.js';
import { protect } from '../middleware/auth.js';
import upload from '../config/multer.js';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(protect);

// Existing routes
router.post('/', createClient);
router.get('/', getClients);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// ============================================
// ✅ ARCHIVE ENDPOINTS - FIXED
// ============================================

// Archive a client
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const organizationId = req.user.organizationId;

    // ✅ FIXED: Query properly with organization
    const client = await Client.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // ✅ FIXED: Check if already archived
    if (client.isArchived) {
      return res.status(400).json({ error: 'Client is already archived' });
    }

    // Check for active invoices
    const activeInvoices = await Invoice.countDocuments({
      client: id,
      organization: organizationId,
      status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] }
    });

    if (activeInvoices > 0) {
      return res.status(400).json({ 
        error: `Cannot archive client with ${activeInvoices} active invoice(s)`,
        activeInvoices 
      });
    }

    // ✅ FIXED: Update all fields properly
    client.isArchived = true;
    client.archivedAt = new Date();
    client.archivedBy = req.user.id;
    client.archiveReason = reason || 'No reason provided';
    client.isActive = false;

    await client.save();

    console.log(`✅ Client ${id} archived:`, {
      isArchived: client.isArchived,
      archivedAt: client.archivedAt,
      archiveReason: client.archiveReason,
    });

    res.json({
      success: true,
      message: 'Client archived successfully',
      client,
    });
  } catch (error) {
    console.error('❌ Error archiving client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unarchive (restore) a client
router.post('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // ✅ FIXED: Query properly
    const client = await Client.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // ✅ FIXED: Check if actually archived
    if (!client.isArchived) {
      return res.status(400).json({ error: 'Client is not archived' });
    }

    // ✅ FIXED: Clear all archive fields
    client.isArchived = false;
    client.archivedAt = null;
    client.archivedBy = null;
    client.archiveReason = null;
    client.isActive = true;

    await client.save();

    console.log(`✅ Client ${id} unarchived:`, {
      isArchived: client.isArchived,
      isActive: client.isActive,
    });

    res.json({
      success: true,
      message: 'Client restored successfully',
      client,
    });
  } catch (error) {
    console.error('❌ Error unarchiving client:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ FIXED: Get archived clients properly
router.get('/archived/list', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // ✅ FIXED: Filter by both organization AND isArchived
    const archivedClients = await Client.find({
      organization: organizationId,
      isArchived: true,
    })
      .populate('archivedBy', 'name email')
      .sort({ archivedAt: -1 });

    console.log(`📋 Found ${archivedClients.length} archived clients`);

    res.json(archivedClients);
  } catch (error) {
    console.error('❌ Error fetching archived clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOGO UPLOAD ENDPOINTS
// ============================================

router.post('/:id/logo', upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const client = await Client.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!client) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete old logo if exists
    if (client.logo) {
      const oldLogoPath = path.join(process.cwd(), client.logo);
      if (fs.existsSync(oldLogoPath)) {
        try {
          fs.unlinkSync(oldLogoPath);
        } catch (error) {
          console.error('Error deleting old logo:', error);
        }
      }
    }

    const logoPath = req.file.path.replace(/\\/g, '/');
    client.logo = logoPath;
    await client.save();

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoPath,
      client,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const client = await Client.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.logo) {
      const logoPath = path.join(process.cwd(), client.logo);
      if (fs.existsSync(logoPath)) {
        try {
          fs.unlinkSync(logoPath);
        } catch (error) {
          console.error('Error deleting logo file:', error);
        }
      }
      client.logo = null;
      await client.save();
    }

    res.json({
      message: 'Logo deleted successfully',
      client,
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;