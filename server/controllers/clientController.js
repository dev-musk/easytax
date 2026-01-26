// ============================================
// FILE: server/controllers/clientController.js
// ✅ FIXED: Include ALL necessary fields in getClients
// ============================================

import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import { validateGSTIN, validatePAN } from '../utils/validators.js';
import fs from 'fs';
import path from 'path';

export const createClient = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    if (data.gstin && !validateGSTIN(data.gstin)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    if (data.pan && !validatePAN(data.pan)) {
      return res.status(400).json({ error: 'Invalid PAN format' });
    }

    if (data.gstin) {
      const existing = await Client.findOne({
        organization: organizationId,
        gstin: data.gstin,
      });
      if (existing) {
        return res.status(400).json({ error: 'Client with this GSTIN already exists' });
      }
    }

    const clientCount = await Client.countDocuments({ organization: organizationId });
    const clientCode = `CLI${String(clientCount + 1).padStart(4, '0')}`;

    if (data.sameAsBilling) {
      data.shippingAddress = data.billingAddress;
      data.shippingCity = data.billingCity;
      data.shippingState = data.billingState;
      data.shippingPincode = data.billingPincode;
    }

    const client = await Client.create({
      ...data,
      clientCode,
      organization: organizationId,
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getClients = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { search, isActive, isTaxable } = req.query;

    const filter = { organization: organizationId };

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isTaxable !== undefined) {
      filter.isTaxable = isTaxable === 'true';
    }

    // ✅ OPTION 1: Get ALL fields (simplest and best for details modal)
    const clients = await Client.find(filter)
      .populate('archivedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`📋 Fetched ${clients.length} clients from DB`);
    console.log(`   Archived: ${clients.filter(c => c.isArchived).length}`);
    console.log(`   Active: ${clients.filter(c => !c.isArchived).length}`);

    res.json(clients);
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ ALTERNATIVE: If you want to optimize and only send specific fields for the list view
// and full fields for the details view, use this approach:
export const getClientsOptimized = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { search, isActive, isTaxable, full } = req.query;

    const filter = { organization: organizationId };

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isTaxable !== undefined) {
      filter.isTaxable = isTaxable === 'true';
    }

    let query = Client.find(filter);

    // If not requesting full details, select only fields needed for table view
    if (full !== 'true') {
      query = query.select(
        'clientCode companyName displayName gstin pan cin ' +
        'contactPerson email phone landline logo ' +
        'msmeCategory udyamNumber ' +
        'isTaxable isActive ' +
        'isArchived archivedAt archivedBy archiveReason ' +
        'createdAt updatedAt'
      );
    }

    const clients = await query
      .populate('archivedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`📋 Fetched ${clients.length} clients (full=${full})`);

    res.json(clients);
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // ✅ No .select() here - get ALL fields
    const client = await Client.findOne({
      _id: id,
      organization: organizationId,
    }).populate('archivedBy', 'name email');

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    if (data.gstin && !validateGSTIN(data.gstin)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    if (data.sameAsBilling) {
      data.shippingAddress = data.billingAddress;
      data.shippingCity = data.billingCity;
      data.shippingState = data.billingState;
      data.shippingPincode = data.billingPincode;
    }

    const client = await Client.findOneAndUpdate(
      { _id: id, organization: organizationId },
      data,
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClient = async (req, res) => {
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
    }

    // Soft delete - set isActive to false
    client.isActive = false;
    await client.save();

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};