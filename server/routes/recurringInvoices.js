// ============================================
// FILE: server/routes/recurringInvoices.js
// NEW FILE - Recurring Invoice Routes
// ============================================

import express from 'express';
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

    const recurring = await RecurringInvoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    // Calculate next invoice number
    const lastInvoice = await Invoice.findOne({ organization: organizationId })
      .sort({ invoiceNumber: -1 });
    
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const invoiceNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    // Create new invoice from template
    const invoiceData = {
      invoiceNumber,
      client: recurring.client,
      invoiceType: recurring.invoiceType,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: recurring.items,
      discountType: recurring.discountType,
      discountValue: recurring.discountValue,
      tdsSection: recurring.tdsSection,
      tdsRate: recurring.tdsRate,
      tdsAmount: 0, // Calculate this
      notes: recurring.notes,
      organization: organizationId,
      status: 'PENDING',
      recurringInvoiceId: recurring._id,
    };

    // Calculate amounts
    const subtotal = recurring.items.reduce((sum, item) => sum + item.amount, 0);
    let discountAmount = 0;
    if (recurring.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * recurring.discountValue) / 100;
    } else {
      discountAmount = recurring.discountValue;
    }
    const taxableAmount = subtotal - discountAmount;
    const totalTax = recurring.items.reduce(
      (sum, item) => sum + (item.amount * item.gstRate) / 100,
      0
    );
    const totalWithTax = taxableAmount + totalTax;
    const tdsAmount = (totalWithTax * recurring.tdsRate) / 100;
    const totalAmount = totalWithTax - tdsAmount;

    invoiceData.subtotalAmount = subtotal;
    invoiceData.discountAmount = discountAmount;
    invoiceData.taxableAmount = taxableAmount;
    invoiceData.cgstAmount = totalTax / 2;
    invoiceData.sgstAmount = totalTax / 2;
    invoiceData.igstAmount = 0;
    invoiceData.tdsAmount = tdsAmount;
    invoiceData.totalAmount = totalAmount;
    invoiceData.paidAmount = 0;
    invoiceData.balanceAmount = totalAmount;

    const invoice = await Invoice.create(invoiceData);

    // Update recurring invoice
    recurring.invoicesGenerated += 1;
    recurring.lastGeneratedDate = new Date();
    
    // Calculate next invoice date
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
    }
    recurring.nextInvoiceDate = nextDate;
    
    await recurring.save();

    res.json({ invoice, recurring });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;