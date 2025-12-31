// ============================================
// FILE: server/routes/creditDebitNotes.js
// Credit Note & Debit Note Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import CreditNote from '../models/CreditNote.js';
import DebitNote from '../models/DebitNote.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import { calculateGSTBreakdown } from '../utils/gstCalculator.js';

const router = express.Router();

router.use(protect);

// ============ CREDIT NOTES ============

// Get all credit notes
router.get('/credit-notes', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const creditNotes = await CreditNote.find({ organization: organizationId })
      .populate('originalInvoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .sort({ creditNoteDate: -1 });

    res.json(creditNotes);
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single credit note
router.get('/credit-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const creditNote = await CreditNote.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate('originalInvoice')
      .populate('client');

    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (error) {
    console.error('Error fetching credit note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create credit note
router.post('/credit-notes', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId, reason, reasonDescription, items, notes } = req.body;

    // Verify invoice
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const organization = await Organization.findById(organizationId);

    // Generate credit note number
    const count = await CreditNote.countDocuments({ organization: organizationId });
    const creditNoteNumber = `CN-${String(count + 1).padStart(5, '0')}`;

    // Calculate GST
    const gstBreakdown = calculateGSTBreakdown(
      items,
      invoice.client.gstin || '',
      organization.gstin || ''
    );

    const subtotal = gstBreakdown.items.reduce((sum, item) => sum + item.amount, 0);

    const creditNote = await CreditNote.create({
      creditNoteNumber,
      originalInvoice: invoiceId,
      client: invoice.client._id,
      creditNoteDate: new Date(),
      reason,
      reasonDescription,
      items: gstBreakdown.items,
      subtotal,
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      totalAmount: subtotal + gstBreakdown.totalTax,
      notes,
      organization: organizationId,
    });

    const populated = await CreditNote.findById(creditNote._id)
      .populate('originalInvoice')
      .populate('client');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating credit note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete credit note
router.delete('/credit-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const creditNote = await CreditNote.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }

    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    console.error('Error deleting credit note:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DEBIT NOTES ============

// Get all debit notes
router.get('/debit-notes', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const debitNotes = await DebitNote.find({ organization: organizationId })
      .populate('originalInvoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .sort({ debitNoteDate: -1 });

    res.json(debitNotes);
  } catch (error) {
    console.error('Error fetching debit notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single debit note
router.get('/debit-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const debitNote = await DebitNote.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate('originalInvoice')
      .populate('client');

    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }

    res.json(debitNote);
  } catch (error) {
    console.error('Error fetching debit note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create debit note
router.post('/debit-notes', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId, reason, reasonDescription, items, notes } = req.body;

    // Verify invoice
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const organization = await Organization.findById(organizationId);

    // Generate debit note number
    const count = await DebitNote.countDocuments({ organization: organizationId });
    const debitNoteNumber = `DN-${String(count + 1).padStart(5, '0')}`;

    // Calculate GST
    const gstBreakdown = calculateGSTBreakdown(
      items,
      invoice.client.gstin || '',
      organization.gstin || ''
    );

    const subtotal = gstBreakdown.items.reduce((sum, item) => sum + item.amount, 0);

    const debitNote = await DebitNote.create({
      debitNoteNumber,
      originalInvoice: invoiceId,
      client: invoice.client._id,
      debitNoteDate: new Date(),
      reason,
      reasonDescription,
      items: gstBreakdown.items,
      subtotal,
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      totalAmount: subtotal + gstBreakdown.totalTax,
      notes,
      organization: organizationId,
    });

    const populated = await DebitNote.findById(debitNote._id)
      .populate('originalInvoice')
      .populate('client');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating debit note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete debit note
router.delete('/debit-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const debitNote = await DebitNote.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }

    res.json({ message: 'Debit note deleted successfully' });
  } catch (error) {
    console.error('Error deleting debit note:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;