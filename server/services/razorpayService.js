// ============================================
// FILE: server/services/razorpayService.js
// ✅ FIXED: With Debug Logging
// ============================================

import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  // ✅ DEBUG: Log the keys (only first/last 4 chars for security)
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log('🔍 Razorpay Configuration Check:');
  console.log('   Key ID exists:', !!keyId);
  console.log('   Key Secret exists:', !!keySecret);
  
  if (keyId) {
    console.log('   Key ID preview:', `${keyId.substring(0, 8)}...${keyId.substring(keyId.length - 4)}`);
  }
  if (keySecret) {
    console.log('   Key Secret preview:', `${keySecret.substring(0, 4)}...${keySecret.substring(keySecret.length - 4)}`);
  }

  if (!keyId || !keySecret) {
    console.warn('⚠️ Razorpay keys not configured. Online payments will not work.');
    console.warn('📝 Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    return null;
  }

  try {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    console.log('✅ Razorpay initialized successfully');
    return razorpayInstance;
  } catch (error) {
    console.error('❌ Razorpay initialization failed:', error.message);
    return null;
  }
};

export const createRazorpayOrder = async (orderData) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please add API keys to .env file');
  }

  try {
    const options = {
      amount: Math.round(orderData.amount * 100),
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {},
    };

    console.log('📝 Creating Razorpay order with:', {
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
    });

    const order = await razorpay.orders.create(options);
    
    console.log('✅ Order created successfully:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Razorpay order creation error:', error);
    
    // ✅ Better error logging
    if (error.statusCode === 401) {
      console.error('🔒 Authentication failed - Your Razorpay keys are invalid or expired');
      console.error('   Please verify your keys in Razorpay Dashboard');
    }
    
    throw new Error(`Failed to create payment order: ${error.error?.description || error.message}`);
  }
};

export const verifyRazorpaySignature = (paymentData) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

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