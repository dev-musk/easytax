// ============================================
// FILE: server/routes/recurringInvoices.js
// NEW FILE - Recurring Invoice Routes
// ============================================

import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import RecurringInvoice from '../models/RecurringInvoice.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Get all recurring invoices
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const recurring = await RecurringInvoice.find({
      organization: organizationId,
    })
      .populate('client', 'companyName email contactPerson')
      .sort({ createdAt: -1 });

    res.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single recurring invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const recurring = await RecurringInvoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recurring invoice
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const recurringData = {
      ...req.body,
      organization: organizationId,
    };

    const recurring = await RecurringInvoice.create(recurringData);

    res.status(201).json(recurring);
  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update recurring invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const recurring = await RecurringInvoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json(recurring);
  } catch (error) {
    console.error('Error updating recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recurring invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const recurring = await RecurringInvoice.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json({ message: 'Recurring invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause/Resume recurring invoice
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const recurring = await RecurringInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    recurring.isActive = !recurring.isActive;
    await recurring.save();

    res.json(recurring);
  } catch (error) {
    console.error('Error toggling recurring invoice status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate invoice now (manual trigger)
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Get recurring template
    const recurring = await RecurringInvoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    if (!recurring.client) {
      return res.status(400).json({ error: 'Client not found for this template' });
    }

    // Get organization details
    const organization = await mongoose.model('Organization').findById(organizationId);
    
    if (!organization) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Import GST calculator
    const { calculateGSTBreakdown } = await import('../utils/gstCalculator.js');

    // Calculate GST breakdown using organization and client GSTIN
    const gstBreakdown = calculateGSTBreakdown(
      recurring.items,
      recurring.client.gstin || '',
      organization.gstin || ''
    );

    // Calculate invoice number
    const invoiceNumber = `${organization.invoicePrefix || 'INV'}-${String(
      organization.nextInvoiceNumber || 1
    ).padStart(5, '0')}`;

    // Calculate subtotal
    const subtotal = gstBreakdown.items.reduce((sum, item) => sum + item.amount, 0);

    // Calculate discount
    let discountAmount = 0;
    if (recurring.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * (recurring.discountValue || 0)) / 100;
    } else {
      discountAmount = recurring.discountValue || 0;
    }

    // Calculate taxable amount and total
    const taxableAmount = subtotal - discountAmount;
    const totalTax = gstBreakdown.totalTax;
    const totalWithTax = taxableAmount + totalTax;

    // Calculate TDS
    const tdsAmount = (totalWithTax * (recurring.tdsRate || 0)) / 100;

    // Calculate final total
    const totalAmount = totalWithTax - tdsAmount;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalTotal = Math.round(totalAmount);

    // Calculate due date (30 days from now by default)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice data
    const invoiceData = {
      invoiceNumber,
      invoiceType: recurring.invoiceType || 'TAX_INVOICE',
      client: recurring.client._id,
      invoiceDate: new Date(),
      dueDate: dueDate,
      items: gstBreakdown.items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType: recurring.discountType || 'PERCENTAGE',
      discountValue: recurring.discountValue || 0,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      tdsApplicable: (recurring.tdsRate || 0) > 0,
      tdsRate: recurring.tdsRate || 0,
      tdsAmount: parseFloat(tdsAmount.toFixed(2)),
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: finalTotal,
      paidAmount: 0,
      balanceAmount: finalTotal,
      status: 'PENDING',
      notes: recurring.notes || '',
      organization: organizationId,
      isRecurring: true,
      recurringInvoiceId: recurring._id,
    };

    // Create the invoice
    const invoice = await Invoice.create(invoiceData);

    // Update recurring template
    recurring.invoicesGenerated = (recurring.invoicesGenerated || 0) + 1;
    recurring.lastGeneratedDate = new Date();

    // Calculate next invoice date based on frequency
    const nextDate = new Date(recurring.nextInvoiceDate);
    switch (recurring.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    recurring.nextInvoiceDate = nextDate;

    await recurring.save();

    // Increment organization's invoice number
    await organization.updateOne({ $inc: { nextInvoiceNumber: 1 } });

    // Populate the invoice
    const populatedInvoice = await Invoice.findById(invoice._id).populate('client');

    res.json({ 
      success: true,
      invoice: populatedInvoice, 
      recurring: recurring,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

export default router;