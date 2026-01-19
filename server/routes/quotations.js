// ============================================
// FILE: server/routes/quotations.js
// PHASE 4: Quotations Routes
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Organization from '../models/Organization.js';
import { calculateGSTBreakdown } from '../utils/gstCalculator.js';
import { amountToWords } from '../utils/numberToWords.js';

const router = express.Router();

router.use(protect);

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, clientId } = req.query;

    const filter = { organization: organizationId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (clientId) {
      filter.client = clientId;
    }

    const quotations = await Quotation.find(filter)
      .populate('client', 'companyName email gstin')
      .populate('invoiceId', 'invoiceNumber')
      .sort({ createdAt: -1 });

    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single quotation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const quotation = await Quotation.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client').populate('invoiceId', 'invoiceNumber');

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create quotation
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const data = req.body;

    // Get organization and client
    const [organization, client] = await Promise.all([
      Organization.findById(organizationId),
      Client.findById(data.clientId),
    ]);

    if (!client) {
      return res.status(400).json({ error: 'Client not found' });
    }

    // Generate quotation number
    const quotationCount = await Quotation.countDocuments({ organization: organizationId });
    const quotationNumber = `QUO-${String(quotationCount + 1).padStart(4, '0')}`;

    // Calculate GST breakdown
    const gstBreakdown = calculateGSTBreakdown(
      data.items,
      client.gstin,
      organization.gstin
    );

    // Calculate totals
    const subtotal = gstBreakdown.items.reduce((sum, item) => sum + item.amount, 0);

    let discountAmount = 0;
    if (data.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * data.discountValue) / 100;
    } else {
      discountAmount = data.discountValue || 0;
    }

    const taxableAmount = subtotal - discountAmount;
    const totalAmount = taxableAmount + gstBreakdown.totalTax;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalTotal = Math.round(totalAmount);

    // Calculate amount in words
    const amountInWordsText = amountToWords(finalTotal);

    // Create quotation
    const quotation = await Quotation.create({
      quotationNumber,
      client: data.clientId,
      quotationDate: data.quotationDate,
      validUntil: data.validUntil,
      items: gstBreakdown.items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: finalTotal,
      amountInWords: amountInWordsText,
      status: 'DRAFT',
      notes: data.notes,
      termsConditions: data.termsConditions,
      template: data.template || organization.displaySettings?.defaultTemplate || 'MODERN',
      organization: organizationId,
    });

    // Populate and return
    const populatedQuotation = await Quotation.findById(quotation._id).populate('client');

    res.status(201).json(populatedQuotation);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update quotation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    // Check if quotation exists
    const existingQuotation = await Quotation.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!existingQuotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Don't allow editing if converted
    if (existingQuotation.convertedToInvoice) {
      return res.status(400).json({ error: 'Cannot edit quotation that has been converted to invoice' });
    }

    // If totalAmount is being updated, recalculate amount in words
    if (data.totalAmount) {
      data.amountInWords = amountToWords(data.totalAmount);
    }

    const quotation = await Quotation.findOneAndUpdate(
      { _id: id, organization: organizationId },
      data,
      { new: true }
    ).populate('client');

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const quotation = await Quotation.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Don't allow deleting if converted
    if (quotation.convertedToInvoice) {
      return res.status(400).json({ error: 'Cannot delete quotation that has been converted to invoice' });
    }

    await Quotation.findByIdAndDelete(id);

    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert quotation to invoice
router.post('/:id/convert-to-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Get quotation
    const quotation = await Quotation.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Check if already converted
    if (quotation.convertedToInvoice) {
      return res.status(400).json({ error: 'Quotation already converted to invoice' });
    }

    // Get organization
    const organization = await Organization.findById(organizationId);

    // Generate invoice number
    const invoiceNumber = `${organization.invoicePrefix}-${String(
      organization.nextInvoiceNumber
    ).padStart(4, '0')}`;

    // Create invoice from quotation
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: 'TAX_INVOICE',
      client: quotation.client._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      quotationNumber: quotation.quotationNumber,
      items: quotation.items,
      subtotal: quotation.subtotal,
      discountType: quotation.discountType,
      discountValue: quotation.discountValue,
      discountAmount: quotation.discountAmount,
      cgst: quotation.cgst,
      sgst: quotation.sgst,
      igst: quotation.igst,
      totalTax: quotation.totalTax,
      roundOff: quotation.roundOff,
      totalAmount: quotation.totalAmount,
      amountInWords: quotation.amountInWords,
      paidAmount: 0,
      balanceAmount: quotation.totalAmount,
      status: 'PENDING',
      notes: quotation.notes,
      termsConditions: quotation.termsConditions,
      template: quotation.template,
      organization: organizationId,
    });

    // Update quotation
    quotation.convertedToInvoice = true;
    quotation.invoiceId = invoice._id;
    quotation.convertedAt = new Date();
    quotation.status = 'CONVERTED';
    await quotation.save();

    // Increment invoice number
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { nextInvoiceNumber: 1 },
    });

    // Populate and return invoice
    const populatedInvoice = await Invoice.findById(invoice._id).populate('client');

    res.json({
      message: 'Quotation converted to invoice successfully',
      invoice: populatedInvoice,
      quotation: quotation,
    });
  } catch (error) {
    console.error('Convert to invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update quotation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.user.organizationId;

    const quotation = await Quotation.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { status },
      { new: true }
    ).populate('client');

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;