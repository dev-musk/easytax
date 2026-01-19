// ============================================
// FILE: server/routes/clients.js
// UPDATED - Replace your current file
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
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Existing routes - using controller functions
router.post('/', createClient);
router.get('/', getClients);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// NEW: Logo upload endpoint
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
      // Delete uploaded file if client not found
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

    // Update client with new logo path
    const logoPath = req.file.path.replace(/\\/g, '/'); // Normalize path for Windows
    client.logo = logoPath;
    await client.save();

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoPath,
      client,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    // Delete uploaded file on error
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

// NEW: Delete logo endpoint
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

    // Delete logo file if exists
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