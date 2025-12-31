// ============================================
// FILE: server/routes/organization.js (COMPLETE ENHANCED VERSION)
// Phase 1 Implementation - Company Settings API
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Organization from '../models/Organization.js';
import upload from '../config/multer.js';
import fs from 'fs';
import path from 'path';
import { previewInvoiceNumber } from '../utils/invoiceNumberGenerator.js';

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

// Upload company logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Delete old logo if exists
    if (organization.logo) {
      const oldLogoPath = path.join(process.cwd(), organization.logo);
      if (fs.existsSync(oldLogoPath)) {
        try {
          fs.unlinkSync(oldLogoPath);
        } catch (error) {
          console.error('Error deleting old logo:', error);
        }
      }
    }

    const logoPath = req.file.path.replace(/\\/g, '/');
    organization.logo = logoPath;
    await organization.save();

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoPath,
      organization,
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

// Delete company logo
router.delete('/logo', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (organization.logo) {
      const logoPath = path.join(process.cwd(), organization.logo);
      if (fs.existsSync(logoPath)) {
        try {
          fs.unlinkSync(logoPath);
        } catch (error) {
          console.error('Error deleting logo file:', error);
        }
      }
      organization.logo = null;
      await organization.save();
    }

    res.json({
      message: 'Logo deleted successfully',
      organization,
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload authorized signature
router.post('/signature', upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Delete old signature if exists
    if (organization.authorizedSignatory?.signatureImage) {
      const oldSignaturePath = path.join(
        process.cwd(),
        organization.authorizedSignatory.signatureImage
      );
      if (fs.existsSync(oldSignaturePath)) {
        try {
          fs.unlinkSync(oldSignaturePath);
        } catch (error) {
          console.error('Error deleting old signature:', error);
        }
      }
    }

    const signaturePath = req.file.path.replace(/\\/g, '/');
    
    organization.authorizedSignatory = {
      ...organization.authorizedSignatory,
      signatureImage: signaturePath,
      name: req.body.name || organization.authorizedSignatory?.name,
      designation: req.body.designation || organization.authorizedSignatory?.designation,
    };
    
    await organization.save();

    res.json({
      message: 'Signature uploaded successfully',
      signature: signaturePath,
      organization,
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
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

// Delete signature
router.delete('/signature', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (organization.authorizedSignatory?.signatureImage) {
      const signaturePath = path.join(
        process.cwd(),
        organization.authorizedSignatory.signatureImage
      );
      if (fs.existsSync(signaturePath)) {
        try {
          fs.unlinkSync(signaturePath);
        } catch (error) {
          console.error('Error deleting signature file:', error);
        }
      }
      organization.authorizedSignatory.signatureImage = null;
      await organization.save();
    }

    res.json({
      message: 'Signature deleted successfully',
      organization,
    });
  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update bank details
router.patch('/bank-details', async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        $set: {
          bankDetails: req.body,
        },
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update CIN
router.patch('/cin', async (req, res) => {
  try {
    const { cin } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: { cin } },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating CIN:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update invoice number settings
router.patch('/invoice-settings', async (req, res) => {
  try {
    const {
      invoiceNumberMode,
      invoicePrefix,
      invoiceNumberFormat,
    } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        $set: {
          invoiceNumberMode: invoiceNumberMode || 'AUTO',
          invoicePrefix: invoicePrefix || 'INV',
          invoiceNumberFormat: invoiceNumberFormat || '{PREFIX}-{FY}-{SEQ}',
        },
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preview next invoice number
router.get('/invoice-number-preview', async (req, res) => {
  try {
    const preview = await previewInvoiceNumber(
      req.user.organizationId,
      Organization
    );

    res.json(preview);
  } catch (error) {
    console.error('Error previewing invoice number:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update display settings
router.patch('/display-settings', async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        $set: {
          displaySettings: req.body,
        },
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating display settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update annual turnover (affects HSN digit requirement)
router.patch('/turnover', async (req, res) => {
  try {
    const { annualTurnover } = req.body;

    if (annualTurnover < 0) {
      return res.status(400).json({ error: 'Annual turnover cannot be negative' });
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    organization.annualTurnover = annualTurnover;

    // Auto-update HSN digits required
    if (annualTurnover <= 50000000) {
      organization.hsnDigitsRequired = 4;
    } else {
      organization.hsnDigitsRequired = 6;
    }

    await organization.save();

    res.json({
      message: 'Annual turnover updated',
      organization,
      hsnDigitsRequired: organization.hsnDigitsRequired,
    });
  } catch (error) {
    console.error('Error updating turnover:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;