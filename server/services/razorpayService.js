// ============================================
// FILE: server/services/razorpayService.js
// Razorpay Payment Integration Service (FIXED)
// ============================================

import Razorpay from 'razorpay';
import crypto from 'crypto';

// ✅ Lazy initialization - only create when actually needed
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  // Check if keys are available
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️ Razorpay keys not configured. Online payments will not work.');
    console.warn('📝 Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    return null;
  }

  // Create and cache the instance
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log('✅ Razorpay initialized successfully');
  return razorpayInstance;
};

/**
 * Create Razorpay Order
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Razorpay order
 */
export const createRazorpayOrder = async (orderData) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please add API keys to .env file');
  }

  try {
    const options = {
      amount: Math.round(orderData.amount * 100), // Amount in paise (₹1 = 100 paise)
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {},
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay Payment Signature
 * @param {Object} paymentData - Payment verification data
 * @returns {Boolean} Verification result
 */
export const verifyRazorpaySignature = (paymentData) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // Create signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Compare signatures
    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Fetch Payment Details
 * @param {String} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
export const fetchPaymentDetails = async (paymentId) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw new Error('Failed to fetch payment details');
  }
};

/**
 * Initiate Refund
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount - Refund amount in rupees
 * @returns {Promise<Object>} Refund details
 */
export const initiateRefund = async (paymentId, amount) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });
    return refund;
  } catch (error) {
    console.error('Refund error:', error);
    throw new Error('Failed to process refund');
  }
};

/**
 * Check if Razorpay is configured
 * @returns {Boolean}
 */
export const isRazorpayConfigured = () => {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
  initiateRefund,
  isRazorpayConfigured,
};