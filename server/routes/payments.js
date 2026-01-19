// ============================================
// FILE: server/routes/payments.js
// Payment Management Routes WITH RAZORPAY
// ============================================

import express from 'express';
import { protect } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
} from '../services/razorpayService.js';

const router = express.Router();

router.use(protect);

// ✅ NEW: Create Razorpay Order for Online Payment
router.post('/create-order', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const organizationId = req.user.organizationId;

    // Fetch invoice
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

    // Create Razorpay order
    const orderData = {
      amount: invoice.balanceAmount, // Amount in rupees
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

// ✅ NEW: Verify Razorpay Payment
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoiceId,
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verify signature
    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }

    // Fetch invoice
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentAmount = paymentDetails.amount / 100; // Convert paise to rupees

    // Generate payment number
    const paymentCount = await Payment.countDocuments({ organization: organizationId });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(5, '0')}`;

    // Create payment record
    const payment = await Payment.create({
      paymentNumber,
      invoice: invoiceId,
      client: invoice.client,
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMode: 'ONLINE',
      referenceNumber: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      notes: `Online payment via Razorpay - ${paymentDetails.method || 'Unknown'}`,
      organization: organizationId,
    });

    // Update invoice
    invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    if (invoice.balanceAmount <= 0) {
      invoice.status = 'PAID';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'PARTIALLY_PAID';
    }

    await invoice.save();

    // Populate and return
    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName');

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
    const { invoiceId, clientId, startDate, endDate } = req.query;

    const filter = { organization: organizationId };
    if (invoiceId) filter.invoice = invoiceId;
    if (clientId) filter.client = clientId;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName')
      .sort({ paymentDate: -1 });

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
    }).sort({ paymentDate: -1 });

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
    const { invoiceId, amount, paymentDate, paymentMode, referenceNumber, bankName, notes } = req.body;

    // Verify invoice exists and belongs to organization
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      organization: organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if payment amount is valid
    if (amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    if (amount > invoice.balanceAmount) {
      return res.status(400).json({ 
        error: `Payment amount (₹${amount}) exceeds balance amount (₹${invoice.balanceAmount})` 
      });
    }

    // Generate payment number
    const paymentCount = await Payment.countDocuments({ organization: organizationId });
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(5, '0')}`;

    // Create payment
    const payment = await Payment.create({
      paymentNumber,
      invoice: invoiceId,
      client: invoice.client,
      amount: parseFloat(amount),
      paymentDate: paymentDate || new Date(),
      paymentMode,
      referenceNumber,
      bankName,
      notes,
      organization: organizationId,
    });

    // Update invoice payment status
    invoice.paidAmount = (invoice.paidAmount || 0) + parseFloat(amount);
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    // Update invoice status based on payment
    if (invoice.balanceAmount <= 0) {
      invoice.status = 'PAID';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'PARTIALLY_PAID';
    }

    await invoice.save();

    // Populate and return
    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName');

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
    const { amount, paymentDate, paymentMode, referenceNumber, bankName, notes } = req.body;

    const payment = await Payment.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Don't allow updating Razorpay payments
    if (payment.razorpayPaymentId) {
      return res.status(400).json({ error: 'Cannot update online payments' });
    }

    const oldAmount = payment.amount;
    const amountDifference = parseFloat(amount) - oldAmount;

    // Update payment
    payment.amount = parseFloat(amount);
    payment.paymentDate = paymentDate || payment.paymentDate;
    payment.paymentMode = paymentMode || payment.paymentMode;
    payment.referenceNumber = referenceNumber;
    payment.bankName = bankName;
    payment.notes = notes;
    await payment.save();

    // Update invoice amounts
    const invoice = await Invoice.findById(payment.invoice);
    if (invoice) {
      invoice.paidAmount = (invoice.paidAmount || 0) + amountDifference;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

      // Update status
      if (invoice.balanceAmount <= 0) {
        invoice.status = 'PAID';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'PARTIALLY_PAID';
      } else {
        invoice.status = 'PENDING';
      }

      await invoice.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber invoiceDate totalAmount')
      .populate('client', 'companyName');

    res.json(populatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const payment = await Payment.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Don't allow deleting Razorpay payments
    if (payment.razorpayPaymentId) {
      return res.status(400).json({ error: 'Cannot delete online payments. Contact support for refunds.' });
    }

    const paymentAmount = payment.amount;
    const invoiceId = payment.invoice;

    // Delete payment
    await payment.deleteOne();

    // Update invoice
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.paidAmount = (invoice.paidAmount || 0) - paymentAmount;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

      // Update status
      if (invoice.balanceAmount <= 0) {
        invoice.status = 'PAID';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'PARTIALLY_PAID';
      } else {
        invoice.status = 'PENDING';
      }

      await invoice.save();
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;