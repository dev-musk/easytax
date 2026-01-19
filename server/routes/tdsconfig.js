// ============================================
// FILE: server/routes/tdsconfig.js
// NEW FILE - TDS Configuration Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import TDSConfig from '../models/TDSConfig.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get all TDS configurations
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const configs = await TDSConfig.find({
      organization: organizationId,
    }).sort({ section: 1 });

    res.json(configs);
  } catch (error) {
    console.error('Error fetching TDS configs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single TDS configuration
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const config = await TDSConfig.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!config) {
      return res.status(404).json({ error: 'TDS configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching TDS config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create TDS configuration
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Check if section already exists
    const existingConfig = await TDSConfig.findOne({
      section: req.body.section,
      organization: organizationId,
    });

    if (existingConfig) {
      return res.status(400).json({ error: 'TDS section already exists' });
    }

    const configData = {
      ...req.body,
      organization: organizationId,
    };

    const config = await TDSConfig.create(configData);

    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating TDS config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update TDS configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const config = await TDSConfig.findOneAndUpdate(
      { _id: id, organization: organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ error: 'TDS configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating TDS config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete TDS configuration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const config = await TDSConfig.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!config) {
      return res.status(404).json({ error: 'TDS configuration not found' });
    }

    res.json({ message: 'TDS configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting TDS config:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;