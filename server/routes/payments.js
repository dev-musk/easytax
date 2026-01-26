// ============================================
// FILE: server/routes/payments.js
// ✅ FEATURE #51: Added bank handling
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import BankAccount from '../models/BankAccount.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
} from '../services/razorpayService.js';

const router = express.Router();

router.use(protect);

// Helper function to update invoice status
const updateInvoiceStatus = async (invoice) => {
  invoice.paidAmount = invoice.paidAmount || 0;
  invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

  if (invoice.balanceAmount <= 0) {
    invoice.status = 'PAID';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIALLY_PAID';
  } else {
    invoice.status = 'PENDING';
  }

  await invoice.save();
};

// Create Razorpay Order for Online Payment
router.post('/create-order', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const organizationId = req.user.organizationId;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    }).populate('client', 'companyName email phone');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.balanceAmount <= 0) {
      return res.status(400).json({ error: 'Invoice is already fully paid' });
    }

    const orderData = {
      amount: invoice.balanceAmount,
      currency: 'INR',
      receipt: `INV_${invoice.invoiceNumber}_${Date.now()}`,
      notes: {
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client?.companyName || 'Unknown',
        organizationId: organizationId.toString(),
      },
    };

    const razorpayOrder = await createRazorpayOrder(orderData);

    res.json({
      success: true,
      order: razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        balanceAmount: invoice.balanceAmount,
        client: invoice.client,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay Payment
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoiceId,
      bankId, // ✅ FEATURE #51
    } = req.body;

    const organizationId = req.user.organizationId;

    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // ✅ FEATURE #51: Validate bank
    if (!bankId) {
      return res.status(400).json({ error: 'Bank account is required' });
    }

    const bank = await BankAccount.findOne({
      _id: bankId,
      organization: organizationId,
      isActive: true,
      isArchived: false,
    });

    if (!bank) {
      return res.status(404).json({ error: 'Bank account not found or inactive' });
    }

    const paymentAmount = paymentDetails.amount / 100;

    const paymentCount = await Payment.countDocuments({ organization: organizationId });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(5, '0')}`;

    const existingPayments = await Payment.countDocuments({ invoice: invoiceId });
    const isPrimary = existingPayments === 0;

    const payment = await Payment.create({
      paymentNumber,
      invoice: invoiceId,
      client: invoice.client,
      bank: bankId, // ✅ FEATURE #51
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMode: 'ONLINE',
      referenceNumber: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      notes: `Online payment via Razorpay - ${paymentDetails.method || 'Unknown'}`,
      isPrimary,
      organization: organizationId,
    });

    invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
    await updateInvoiceStatus(invoice);

    // ✅ FEATURE #51: Update bank balance
    bank.currentBalance = (bank.currentBalance || 0) + paymentAmount;
    await bank.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .populate('bank', 'accountName bankName'); // ✅ FEATURE #51

    res.json({
      success: true,
      message: 'Payment verified and recorded successfully',
      payment: populatedPayment,
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        status: invoice.status,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all payments (with optional filters)
router.get('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId, clientId, bankId, startDate, endDate } = req.query;

    const filter = { organization: organizationId };
    if (invoiceId) filter.invoice = invoiceId;
    if (clientId) filter.client = clientId;
    if (bankId) filter.bank = bankId; // ✅ FEATURE #51: Filter by bank
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount balanceAmount')
      .populate('client', 'companyName')
      .populate('bank', 'accountName bankName accountNumber') // ✅ FEATURE #51
      .sort({ isPrimary: -1, paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payments for a specific invoice
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const organizationId = req.user.organizationId;

    const payments = await Payment.find({
      invoice: invoiceId,
      organization: organizationId,
    })
      .populate('bank', 'accountName bankName') // ✅ FEATURE #51
      .sort({ isPrimary: -1, paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record a manual payment
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { invoiceId, bankId, amount, paymentDate, paymentMode, referenceNumber, bankName, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // ✅ FEATURE #51: Validate bank
    if (!bankId) {
      return res.status(400).json({ error: 'Bank account is required' });
    }

    const bank = await BankAccount.findOne({
      _id: bankId,
      organization: organizationId,
      isActive: true,
      isArchived: false,
    });

    if (!bank) {
      return res.status(404).json({ error: 'Bank account not found or inactive' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    if (amount > invoice.balanceAmount) {
      return res.status(400).json({ 
        error: `Payment amount (₹${amount}) exceeds balance amount (₹${invoice.balanceAmount})` 
      });
    }

    const paymentCount = await Payment.countDocuments({ organization: organizationId });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(5, '0')}`;

    const existingPayments = await Payment.countDocuments({ invoice: invoiceId });
    const isPrimary = existingPayments === 0;

    const payment = await Payment.create({
      paymentNumber,
      invoice: invoiceId,
      client: invoice.client,
      bank: bankId, // ✅ FEATURE #51
      amount: parseFloat(amount),
      paymentDate: paymentDate || new Date(),
      paymentMode,
      referenceNumber,
      bankName,
      notes,
      isPrimary,
      organization: organizationId,
    });

    invoice.paidAmount = (invoice.paidAmount || 0) + parseFloat(amount);
    await updateInvoiceStatus(invoice);

    // ✅ FEATURE #51: Update bank balance
    bank.currentBalance = (bank.currentBalance || 0) + parseFloat(amount);
    await bank.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .populate('bank', 'accountName bankName'); // ✅ FEATURE #51

    res.status(201).json({
      payment: populatedPayment,
      invoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        status: invoice.status,
      },
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { amount, bankId, paymentDate, paymentMode, referenceNumber, bankName, notes } = req.body;

    const payment = await Payment.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.razorpayPaymentId) {
      return res.status(400).json({ error: 'Cannot update online payments' });
    }

    const oldAmount = payment.amount;
    const oldBankId = payment.bank.toString();
    const amountDifference = parseFloat(amount) - oldAmount;

    // ✅ FEATURE #51: Handle bank change
    if (bankId && bankId !== oldBankId) {
      const newBank = await BankAccount.findOne({
        _id: bankId,
        organization: organizationId,
        isActive: true,
        isArchived: false,
      });

      if (!newBank) {
        return res.status(404).json({ error: 'Bank account not found or inactive' });
      }

      // Reverse from old bank
      const oldBank = await BankAccount.findById(oldBankId);
      if (oldBank) {
        oldBank.currentBalance = (oldBank.currentBalance || 0) - oldAmount;
        await oldBank.save();
      }

      // Add to new bank
      newBank.currentBalance = (newBank.currentBalance || 0) + parseFloat(amount);
      await newBank.save();

      payment.bank = bankId;
    } else if (amountDifference !== 0) {
      // ✅ FEATURE #51: Update bank balance if amount changed
      const bank = await BankAccount.findById(payment.bank);
      if (bank) {
        bank.currentBalance = (bank.currentBalance || 0) + amountDifference;
        await bank.save();
      }
    }

    payment.amount = parseFloat(amount);
    payment.paymentDate = paymentDate || payment.paymentDate;
    payment.paymentMode = paymentMode || payment.paymentMode;
    payment.referenceNumber = referenceNumber;
    payment.bankName = bankName;
    payment.notes = notes;
    await payment.save();

    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) {
      invoice.paidAmount = (invoice.paidAmount || 0) + amountDifference;
      await updateInvoiceStatus(invoice);
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .populate('bank', 'accountName bankName'); // ✅ FEATURE #51

    res.json(populatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete payment - SYNC WITH INVOICE AND BANK
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const payment = await Payment.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.razorpayPaymentId) {
      return res.status(400).json({ 
        error: 'Cannot delete online payments. Contact support for refunds.' 
      });
    }

    const paymentAmount = payment.amount;
    const invoiceId = payment.invoice;
    const bankId = payment.bank;
    const wasPaymentPrimary = payment.isPrimary;

    // Delete payment
    const deletedPayment = await Payment.findByIdAndDelete(id);

    if (!deletedPayment) {
      return res.status(500).json({ error: 'Failed to delete payment' });
    }

    // ✅ FEATURE #51: Reverse bank balance
    const bank = await BankAccount.findById(bankId);
    if (bank) {
      bank.currentBalance = Math.max(0, (bank.currentBalance || 0) - paymentAmount);
      await bank.save();
    }

    // Update invoice after deletion
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - paymentAmount);
      await updateInvoiceStatus(invoice);

      // If deleted payment was primary, mark next payment as primary
      if (wasPaymentPrimary) {
        const nextPayment = await Payment.findOne({ invoice: invoiceId }).sort({ paymentDate: 1 });
        if (nextPayment) {
          nextPayment.isPrimary = true;
          await nextPayment.save();
        }
      }
    }

    return res.status(200).json({ 
      success: true,
      message: 'Payment deleted successfully and invoice/bank status updated',
      deletedPaymentId: id,
      updatedInvoice: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        status: invoice.status,
      }
    });

  } catch (error) {
    console.error('Error deleting payment:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid payment ID format' });
    }
    
    res.status(500).json({ 
      error: error.message || 'An error occurred while deleting the payment' 
    });
  }
});

export default router;