// ============================================
// FILE: server/routes/recurringInvoices.js
// ULTIMATE FINAL FIX - All Invoice model fields
// ============================================

import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import RecurringInvoice from '../models/RecurringInvoice.js';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import Client from '../models/Client.js';
import { calculateGSTBreakdown } from '../utils/gstCalculator.js';
import { amountToWords } from '../utils/numberToWords.js';

const router = express.Router();

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

// Generate invoice now (manual trigger) - ULTIMATE FINAL FIX
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    console.log('🔄 Starting invoice generation for template:', id);

    // Get recurring template with populated client
    const recurring = await RecurringInvoice.findOne({
      _id: id,
      organization: organizationId,
    }).populate('client');

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    // Get client separately to ensure all data
    const client = await Client.findById(recurring.client._id);
    if (!client) {
      return res.status(400).json({ error: 'Client not found for this template' });
    }

    // Get organization details
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    console.log('✅ Loaded template, client, and organization');

    // Prepare items with amounts
    const preparedItems = recurring.items.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = quantity * rate;

      return {
        description: item.description || '',
        hsnSacCode: item.hsnSacCode || '999293',
        quantity: quantity,
        unit: item.unit || 'UNIT',
        rate: rate,
        gstRate: parseFloat(item.gstRate) || 0,
        itemType: item.itemType || 'SERVICE',
        amount: amount,
      };
    });

    console.log('✅ Prepared items:', preparedItems.length, 'items');
    console.log('📊 Item amounts:', preparedItems.map(i => i.amount));

    // Call GST calculator
    const gstBreakdown = calculateGSTBreakdown(
      preparedItems,
      client.gstin || '',
      organization.gstin || ''
    );

    console.log('✅ GST breakdown calculated');
    console.log('📊 GST breakdown items:', gstBreakdown.items?.length || 0);

    // Calculate subtotal from GST breakdown
    const subtotal = gstBreakdown.items.reduce((sum, item) => {
      const itemAmount = parseFloat(item.taxableValue || item.amount || 0);
      console.log(`  Item: ${item.description?.substring(0, 20)} = ₹${itemAmount}`);
      return sum + itemAmount;
    }, 0);

    console.log('📊 Subtotal calculated:', subtotal);

    if (isNaN(subtotal) || subtotal === 0) {
      throw new Error('Failed to calculate subtotal');
    }

    // Calculate discount
    const discountType = recurring.discountType || 'PERCENTAGE';
    const discountValue = parseFloat(recurring.discountValue) || 0;
    
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    console.log('📊 Discount:', discountAmount);

    // Calculate taxable amount
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    console.log('📊 Taxable amount:', taxableAmount);

    // Get GST totals
    const totalTax = parseFloat(gstBreakdown.totalTax) || 0;
    const totalCGST = parseFloat(gstBreakdown.totalCGST) || 0;
    const totalSGST = parseFloat(gstBreakdown.totalSGST) || 0;
    const totalIGST = parseFloat(gstBreakdown.totalIGST) || 0;

    console.log('📊 Tax breakdown:', { totalCGST, totalSGST, totalIGST, totalTax });

    // Calculate TDS
    const tdsRate = parseFloat(recurring.tdsRate) || 0;
    const tdsAmount = tdsRate > 0 ? (taxableAmount * tdsRate) / 100 : 0;
    console.log('📊 TDS:', tdsAmount);

    // Calculate final totals
    const totalWithTax = taxableAmount + totalTax;
    const totalAmount = totalWithTax - tdsAmount;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalTotal = Math.round(totalAmount);

    console.log('✅ All calculations complete');
    console.log('📊 Final amounts:', {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      totalTax: totalTax.toFixed(2),
      tdsAmount: tdsAmount.toFixed(2),
      roundOff: roundOff.toFixed(2),
      finalTotal: finalTotal
    });

    // Validate calculations
    const amounts = [subtotal, discountAmount, taxableAmount, totalTax, tdsAmount, roundOff, finalTotal];
    if (amounts.some(amt => isNaN(amt))) {
      throw new Error('Invalid calculation: NaN detected');
    }

    // Calculate amount in words
    const amountInWordsText = amountToWords(finalTotal);

    // Generate invoice number
    const invoiceNumber = `${organization.invoicePrefix || 'INV'}-${String(
      organization.nextInvoiceNumber || 1
    ).padStart(5, '0')}`;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (organization.defaultPaymentTerms || 30));

    console.log('💾 Creating invoice...');

    // ====== CRITICAL: Map ALL required fields for Invoice model ======
    const invoiceItems = gstBreakdown.items.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      
      // Calculate base amount (qty * rate)
      const baseAmount = quantity * rate;
      
      // Taxable amount is same as base amount (before tax)
      const itemTaxableAmount = baseAmount;
      
      // Calculate GST on this item
      const itemTax = (itemTaxableAmount * gstRate) / 100;
      
      // Total amount including tax
      const itemTotalAmount = itemTaxableAmount + itemTax;

      return {
        description: item.description || '',
        hsnSacCode: item.hsnSacCode || '999293',
        quantity: quantity,
        unit: item.unit || 'UNIT',
        rate: rate,
        gstRate: gstRate,
        cgst: parseFloat(item.cgst) || 0,
        sgst: parseFloat(item.sgst) || 0,
        igst: parseFloat(item.igst) || 0,
        // ✅ Required fields for Invoice model:
        amount: itemTotalAmount,              // Total including tax
        taxableAmount: itemTaxableAmount,     // Amount before tax
        baseAmount: baseAmount,               // Quantity * Rate
        taxableValue: itemTaxableAmount,      // Same as taxableAmount
        totalAmount: itemTotalAmount,         // Same as amount
        itemType: item.itemType || 'SERVICE',
      };
    });

    console.log('📦 Prepared', invoiceItems.length, 'items for invoice');
    console.log('📦 First item check:', {
      description: invoiceItems[0]?.description,
      amount: invoiceItems[0]?.amount,
      taxableAmount: invoiceItems[0]?.taxableAmount,
      baseAmount: invoiceItems[0]?.baseAmount,
    });

    // Create invoice data
    const invoiceData = {
      invoiceNumber,
      invoiceType: recurring.invoiceType || 'TAX_INVOICE',
      client: client._id,
      invoiceDate: new Date(),
      dueDate: dueDate,
      items: invoiceItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountType: discountType,
      discountValue: discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      cgst: parseFloat(totalCGST.toFixed(2)),
      sgst: parseFloat(totalSGST.toFixed(2)),
      igst: parseFloat(totalIGST.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      tdsApplicable: tdsRate > 0,
      tdsSection: recurring.tdsSection || null,
      tdsRate: tdsRate,
      tdsAmount: parseFloat(tdsAmount.toFixed(2)),
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: finalTotal,
      amountInWords: amountInWordsText,
      paidAmount: 0,
      balanceAmount: finalTotal,
      status: 'PENDING',
      notes: recurring.notes || '',
      organization: organizationId,
      isRecurring: true,
      recurringInvoiceId: recurring._id,
    };

    console.log('💾 Invoice data prepared, creating in database...');

    // Create the invoice
    const invoice = await Invoice.create(invoiceData);

    console.log('✅ Invoice created:', invoice.invoiceNumber);

    // Update recurring template
    recurring.invoicesGenerated = (recurring.invoicesGenerated || 0) + 1;
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
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    recurring.nextInvoiceDate = nextDate;

    await recurring.save();

    console.log('✅ Template updated - next date:', nextDate);

    // Increment organization's invoice number
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { nextInvoiceNumber: 1 },
    });

    console.log('✅ Organization invoice number incremented');

    // Populate the invoice
    const populatedInvoice = await Invoice.findById(invoice._id).populate('client');

    console.log('🎉 Invoice generation complete!');

    res.json({ 
      success: true,
      invoice: populatedInvoice, 
      recurring: recurring,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('❌ Error generating invoice:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;