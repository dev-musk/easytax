// ============================================
// FILE: server/routes/organization.js
// NEW FILE - Organization/Company Settings Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Organization from '../models/Organization.js';

const router = express.Router();

// Apply auth middleware
router.use(protect);

// Get organization details
router.get('/', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update organization details
router.put('/', async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;