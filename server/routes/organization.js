// ============================================
// FILE: server/routes/organization.js
// ✅ FEATURE #21: Multi-GSTIN Management APIs
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Organization from '../models/Organization.js';
import upload from '../config/multer.js';
import fs from 'fs';
import path from 'path';
import { previewInvoiceNumber } from '../utils/invoiceNumberGenerator.js';

const router = express.Router();
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
      { $set: req.body },
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

// ✅ NEW: Get all GSTIN entries
router.get('/gstins', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({
      gstins: organization.gstinEntries || [],
      default: organization.gstinEntries?.find(g => g.isDefault),
    });
  } catch (error) {
    console.error('Error fetching GSTINs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Add new GSTIN
router.post('/gstins', async (req, res) => {
  try {
    const { gstin, address, city, pincode, tradeName, registrationDate } = req.body;
    
    // Validate GSTIN format
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if GSTIN already exists
    const exists = organization.gstinEntries?.some(g => g.gstin === gstin);
    if (exists) {
      return res.status(400).json({ error: 'GSTIN already exists' });
    }
    
    // Extract state code and name
    const stateCode = gstin.substring(0, 2);
    const stateMap = {
      '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
      '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
      '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
      '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
      '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
      '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
      '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
      '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
      '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
      '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana',
      '37': 'Andhra Pradesh',
    };
    
    const stateName = stateMap[stateCode];
    if (!stateName) {
      return res.status(400).json({ error: 'Invalid state code in GSTIN' });
    }
    
    // Create new GSTIN entry
    const newGstin = {
      gstin,
      stateCode,
      stateName,
      tradeName: tradeName || organization.name,
      address,
      city,
      pincode,
      isActive: true,
      isDefault: organization.gstinEntries.length === 0, // First entry is default
      registrationDate: registrationDate || new Date(),
      invoicePrefix: `INV-${stateCode}`,
      invoiceNumbersByFY: {},
      nextInvoiceNumber: 1,
    };
    
    organization.gstinEntries.push(newGstin);
    await organization.save();
    
    res.json({
      message: 'GSTIN added successfully',
      gstin: newGstin,
      organization,
    });
  } catch (error) {
    console.error('Error adding GSTIN:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Update GSTIN entry
router.patch('/gstins/:gstinId', async (req, res) => {
  try {
    const { gstinId } = req.params;
    const updates = req.body;
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const gstinEntry = organization.gstinEntries.id(gstinId);
    if (!gstinEntry) {
      return res.status(404).json({ error: 'GSTIN entry not found' });
    }
    
    // Update allowed fields
    if (updates.address) gstinEntry.address = updates.address;
    if (updates.city) gstinEntry.city = updates.city;
    if (updates.pincode) gstinEntry.pincode = updates.pincode;
    if (updates.tradeName !== undefined) gstinEntry.tradeName = updates.tradeName;
    if (updates.invoicePrefix) gstinEntry.invoicePrefix = updates.invoicePrefix;
    if (updates.isActive !== undefined) gstinEntry.isActive = updates.isActive;
    
    await organization.save();
    
    res.json({
      message: 'GSTIN updated successfully',
      gstin: gstinEntry,
    });
  } catch (error) {
    console.error('Error updating GSTIN:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Set default GSTIN
router.patch('/gstins/:gstinId/set-default', async (req, res) => {
  try {
    const { gstinId } = req.params;
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const gstinEntry = organization.gstinEntries.id(gstinId);
    if (!gstinEntry) {
      return res.status(404).json({ error: 'GSTIN entry not found' });
    }
    
    // Remove default from all others
    organization.gstinEntries.forEach(g => {
      g.isDefault = false;
    });
    
    // Set new default
    gstinEntry.isDefault = true;
    
    await organization.save();
    
    res.json({
      message: 'Default GSTIN updated successfully',
      gstin: gstinEntry,
    });
  } catch (error) {
    console.error('Error setting default GSTIN:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Delete GSTIN entry
router.delete('/gstins/:gstinId', async (req, res) => {
  try {
    const { gstinId } = req.params;
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const gstinEntry = organization.gstinEntries.id(gstinId);
    if (!gstinEntry) {
      return res.status(404).json({ error: 'GSTIN entry not found' });
    }
    
    // Don't allow deleting the last GSTIN
    if (organization.gstinEntries.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the last GSTIN entry' });
    }
    
    // If deleting default, set another as default
    if (gstinEntry.isDefault) {
      const nextGstin = organization.gstinEntries.find(g => g._id.toString() !== gstinId);
      if (nextGstin) nextGstin.isDefault = true;
    }
    
    organization.gstinEntries.pull(gstinId);
    await organization.save();
    
    res.json({
      message: 'GSTIN deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting GSTIN:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get invoices by GSTIN
router.get('/gstins/:gstinId/invoices', async (req, res) => {
  try {
    const { gstinId } = req.params;
    
    const organization = await Organization.findById(req.user.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const gstinEntry = organization.gstinEntries.id(gstinId);
    if (!gstinEntry) {
      return res.status(404).json({ error: 'GSTIN entry not found' });
    }
    
    // This would require Invoice model to have gstinId field
    // For now, return the GSTIN stats
    res.json({
      gstin: gstinEntry.gstin,
      stateName: gstinEntry.stateName,
      nextInvoiceNumber: gstinEntry.nextInvoiceNumber,
      invoicePrefix: gstinEntry.invoicePrefix,
      // TODO: Add actual invoice count and stats
      message: 'Add gstinId field to Invoice model to filter invoices',
    });
  } catch (error) {
    console.error('Error fetching GSTIN invoices:', error);
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

// Update turnover
router.patch('/turnover', async (req, res) => {
  try {
    const { annualTurnover } = req.body;

    if (annualTurnover < 0) {
      return res.status(400).json({ error: 'Annual turnover cannot be negative' });
    }

    const organization = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { 
        $set: { 
          annualTurnover: annualTurnover 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      message: 'Annual turnover updated',
      organization,
      hsnDigitsRequired: organization.hsnDigitsRequired,
      info: organization.annualTurnover <= 50000000 
        ? '≤ ₹5 crore: 4-digit HSN required'
        : '> ₹5 crore: 6-digit HSN required, E-Invoice mandatory'
    });
  } catch (error) {
    console.error('Error updating turnover:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get HSN requirement
router.get('/hsn-requirement', async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const info = {
      annualTurnover: organization.annualTurnover,
      annualTurnoverFormatted: `₹${organization.annualTurnover?.toLocaleString('en-IN') || 0}`,
      hsnDigitsRequired: organization.hsnDigitsRequired,
      threshold: 50000000,
      thresholdFormatted: '₹5,00,00,000',
      rule: organization.annualTurnover <= 50000000 
        ? 'Turnover ≤ ₹5 crore: 4-digit HSN required'
        : 'Turnover > ₹5 crore: 6-digit HSN required',
      isEInvoiceMandatory: organization.annualTurnover > 50000000,
    };

    res.json(info);
  } catch (error) {
    console.error('Error fetching HSN requirement:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;