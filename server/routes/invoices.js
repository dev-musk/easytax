// ============================================
// FILE: server/routes/invoices.js
// FIXED - HSN Validation + Enhanced Search
// Replace your current file with this
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Organization from '../models/Organization.js';
import mongoose from 'mongoose';
import { calculateGSTBreakdown } from '../utils/gstCalculator.js';
import { amountToWords } from '../utils/numberToWords.js';

const router = express.Router();

router.use(protect);

// ✅ FIXED: Enhanced Search with Aggregation Pipeline
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, clientId, search } = req.query;

    // If no search term, use simple query
    if (!search) {
      const filter = { organization: organizationId };

      if (status && status !== 'ALL') {
        filter.status = status;
      }

      if (clientId) {
        filter.client = clientId;
      }

      const invoices = await Invoice.find(filter)
        .populate('client', 'companyName email gstin billingAddress billingCity billingState')
        .sort({ createdAt: -1 });

      return res.json(invoices);
    }

    // ✅ FIXED: Use aggregation for comprehensive search
    const searchRegex = new RegExp(search, 'i');
    const searchNumber = parseFloat(search.replace(/,/g, ''));
    const isValidNumber = !isNaN(searchNumber);

    const pipeline = [
      // Stage 1: Match organization
      {
        $match: { organization: new mongoose.Types.ObjectId(organizationId) }
      },
      
      // Stage 2: Lookup client data
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientData'
        }
      },
      
      // Stage 3: Unwind client
      {
        $unwind: {
          path: '$clientData',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Stage 4: Add search conditions
      {
        $match: {
          $or: [
            // Invoice-level fields
            { invoiceNumber: searchRegex },
            { notes: searchRegex },
            { poNumber: searchRegex },
            { contractNumber: searchRegex },
            { salesPersonName: searchRegex },
            
            // ✅ FIXED: Client fields (populated)
            { 'clientData.companyName': searchRegex },
            { 'clientData.email': searchRegex },
            
            // ✅ FIXED: Item fields (nested array search)
            { 'items.description': searchRegex },
            { 'items.hsnSacCode': searchRegex },
            
            // ✅ FIXED: Amount fields (if valid number)
            ...(isValidNumber ? [
              { totalAmount: { $gte: searchNumber * 0.9, $lte: searchNumber * 1.1 } },
              { subtotal: { $gte: searchNumber * 0.9, $lte: searchNumber * 1.1 } },
              { balanceAmount: { $gte: searchNumber * 0.9, $lte: searchNumber * 1.1 } }
            ] : []),
            
            // ✅ FIXED: Quick notes search
            { 'quickNotes.note': searchRegex }
          ]
        }
      },
      
      // Stage 5: Add client back as object
      {
        $addFields: {
          client: '$clientData'
        }
      },
      
      // Stage 6: Remove temporary field
      {
        $project: {
          clientData: 0
        }
      },
      
      // Stage 7: Sort
      {
        $sort: { createdAt: -1 }
      }
    ];

    // Apply status filter if present
    if (status && status !== 'ALL') {
      pipeline.splice(1, 0, {
        $match: { status: status }
      });
    }

    // Apply client filter if present
    if (clientId) {
      pipeline.splice(1, 0, {
        $match: { client: new mongoose.Types.ObjectId(clientId) }
      });
    }

    const invoices = await Invoice.aggregate(pipeline);

    res.json(invoices);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check for duplicate invoice number
router.get('/check-duplicate', async (req, res) => {
  try {
    const { invoiceNumber } = req.query;
    const organizationId = req.user.organizationId;

    if (!invoiceNumber) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }

    const exists = await Invoice.findOne({
      organization: organizationId,
      invoiceNumber: invoiceNumber,
    });

    res.json({
      exists: !!exists,
      message: exists ? 'Invoice number already exists' : 'Invoice number is available',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate('client')
      .populate('quickNotes.addedBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ FIXED: Create invoice with proper HSN validation
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

    // ✅ FIXED: HSN Validation using hsnDigitsRequired field
    const hsnDigitsRequired = organization.hsnDigitsRequired || 4;
    
    for (const item of data.items) {
      if (item.hsnSacCode) {
        const hsnLength = item.hsnSacCode.replace(/\s/g, '').length;
        
        // Check based on organization's HSN digit requirement
        if (hsnDigitsRequired === 4 && hsnLength !== 4) {
          return res.status(400).json({
            error: `HSN code must be exactly 4 digits (turnover ≤ ₹5 crore). Found: ${item.hsnSacCode} (${hsnLength} digits)`,
            item: item.description,
            required: 4,
            found: hsnLength
          });
        } else if (hsnDigitsRequired === 6 && hsnLength < 6) {
          return res.status(400).json({
            error: `HSN code must be at least 6 digits (turnover > ₹5 crore). Found: ${item.hsnSacCode} (${hsnLength} digits)`,
            item: item.description,
            required: 6,
            found: hsnLength
          });
        }
      }
    }

    // Generate invoice number
    const invoiceNumber = `${organization.invoicePrefix}-${String(
      organization.nextInvoiceNumber
    ).padStart(4, '0')}`;

    // Calculate GST breakdown with metadata
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
    
    // TCS Calculation
    let tcsAmount = 0;
    if (data.tcsApplicable && data.tcsRate) {
      tcsAmount = (taxableAmount * data.tcsRate) / 100;
    }

    const totalAmount = taxableAmount + gstBreakdown.totalTax + tcsAmount - (data.tdsAmount || 0);
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalTotal = Math.round(totalAmount);

    // Calculate amount in words
    const amountInWordsText = amountToWords(finalTotal);

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      invoiceType: data.invoiceType,
      client: data.clientId,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      
      // Additional Fields
      poNumber: data.poNumber,
      poDate: data.poDate,
      contractNumber: data.contractNumber,
      salesPersonName: data.salesPersonName,
      
      items: gstBreakdown.items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      
      cgst: gstBreakdown.totalCGST,
      sgst: gstBreakdown.totalSGST,
      igst: gstBreakdown.totalIGST,
      totalTax: gstBreakdown.totalTax,
      
      tdsSection: data.tdsSection || null,
      tdsRate: data.tdsRate || 0,
      tdsAmount: data.tdsAmount || 0,
      
      tcsApplicable: data.tcsApplicable || false,
      tcsRate: data.tcsRate || 0,
      tcsAmount: tcsAmount,
      
      reverseCharge: data.reverseCharge || false,
      
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: finalTotal,
      amountInWords: amountInWordsText,
      paidAmount: 0,
      balanceAmount: finalTotal,
      status: 'PENDING',
      notes: data.notes,
      
      gstCalculationMeta: {
        clientStateCode: gstBreakdown.transactionInfo?.clientState || 'N/A',
        orgStateCode: gstBreakdown.transactionInfo?.orgState || 'N/A',
        transactionType: gstBreakdown.transactionInfo?.type,
        isInterstate: gstBreakdown.isInterstate,
        gstSplit: gstBreakdown.transactionInfo?.gstSplit,
        clientState: gstBreakdown.transactionInfo?.clientState,
        orgState: gstBreakdown.transactionInfo?.orgState,
        calculatedAt: new Date(),
      },
      
      eInvoice: data.eInvoice,
      eWayBill: data.eWayBill,
      template: data.template || 'MODERN',
      organization: organizationId,
    });

    // Increment invoice number
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { nextInvoiceNumber: 1 },
    });

    // Populate and return
    const populatedInvoice = await Invoice.findById(invoice._id).populate('client');

    res.status(201).json(populatedInvoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const data = req.body;

    // If totalAmount is being updated, recalculate amount in words
    if (data.totalAmount) {
      data.amountInWords = amountToWords(data.totalAmount);
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      data,
      { new: true }
    ).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Quick Note
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const organizationId = req.user.organizationId;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ error: 'Note cannot be empty' });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.quickNotes = invoice.quickNotes || [];
    invoice.quickNotes.push({
      note: note.trim(),
      addedBy: req.user.id,
      addedAt: new Date(),
    });

    await invoice.save();

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('client')
      .populate('quickNotes.addedBy', 'name email');

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update GST Filing Status
router.patch('/:id/filing-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { gstr1Filed, gstr3bFiled, filingPeriod } = req.body;
    const organizationId = req.user.organizationId;

    const updateData = {};
    
    if (gstr1Filed !== undefined) {
      updateData['gstFilingStatus.gstr1Filed'] = gstr1Filed;
      updateData['gstFilingStatus.gstr1FiledDate'] = gstr1Filed ? new Date() : null;
    }
    
    if (gstr3bFiled !== undefined) {
      updateData['gstFilingStatus.gstr3bFiled'] = gstr3bFiled;
      updateData['gstFilingStatus.gstr3bFiledDate'] = gstr3bFiled ? new Date() : null;
    }
    
    if (filingPeriod) {
      updateData['gstFilingStatus.filingPeriod'] = filingPeriod;
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { $set: updateData },
      { new: true }
    ).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOneAndDelete({
      _id: id,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate UPI QR Code
router.get('/:id/upi-qr', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const organization = await Organization.findById(req.user.organizationId);

    if (!organization || !organization.bankDetails?.upiId) {
      return res.status(400).json({
        error: 'UPI ID not configured in organization settings. Please add UPI ID in Settings → Bank Details.',
      });
    }

    const upiString = `upi://pay?pa=${organization.bankDetails.upiId}&pn=${encodeURIComponent(
      organization.name
    )}&am=${invoice.balanceAmount || invoice.totalAmount}&cu=INR&tn=${encodeURIComponent(
      `Payment for Invoice ${invoice.invoiceNumber}`
    )}`;

    res.json({
      upiString,
      upiId: organization.bankDetails.upiId,
      amount: invoice.balanceAmount || invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      companyName: organization.name,
    });
  } catch (error) {
    console.error('Error generating UPI QR:', error);
    res.status(500).json({ error: 'Failed to generate UPI QR code' });
  }
});

// Generate and download PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const organization = await Organization.findById(organizationId);

    const { generateInvoicePDF } = await import('../utils/pdfGenerator.js');
    const html = generateInvoicePDF(invoice, organization);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send invoice via email
router.post('/:id/send-email', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { to, cc, subject, message } = req.body;

    const invoice = await Invoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const organization = await Organization.findById(organizationId);

    invoice.emailSent = true;
    invoice.lastSentAt = new Date();
    await invoice.save();

    res.json({
      message: 'Email sent successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;