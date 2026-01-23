// ============================================
// FILE: test-razorpay-detailed.js
// Enhanced Razorpay Key Verification Script
// ============================================

import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

console.log('='.repeat(60));
console.log('🔍 RAZORPAY KEY VERIFICATION TEST');
console.log('='.repeat(60));

// Step 1: Check if keys exist in environment
console.log('\n📋 Step 1: Environment Variables Check');
console.log('-'.repeat(60));

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId) {
  console.error('❌ RAZORPAY_KEY_ID is not set in .env file!');
  process.exit(1);
}

if (!keySecret) {
  console.error('❌ RAZORPAY_KEY_SECRET is not set in .env file!');
  process.exit(1);
}

console.log('✅ RAZORPAY_KEY_ID found:', keyId);
console.log('✅ RAZORPAY_KEY_SECRET found (first 4 chars):', keySecret.substring(0, 4) + '...');
console.log('✅ RAZORPAY_KEY_SECRET length:', keySecret.length, 'characters');

// Step 2: Validate key format
console.log('\n🔍 Step 2: Key Format Validation');
console.log('-'.repeat(60));

// Check Key ID format
if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
  console.error('❌ Key ID format invalid! Should start with "rzp_test_" or "rzp_live_"');
  console.error('   Found:', keyId);
  process.exit(1);
}

if (keyId.startsWith('rzp_test_')) {
  console.log('✅ Using TEST mode keys (correct for development)');
} else {
  console.warn('⚠️  Using LIVE mode keys (use with caution!)');
}

// Check for common issues
const hasSpaces = keyId.includes(' ') || keySecret.includes(' ');
const hasQuotes = keyId.includes('"') || keySecret.includes('"');
const hasNewlines = keyId.includes('\n') || keySecret.includes('\n');

if (hasSpaces) {
  console.error('❌ Keys contain spaces! Remove all spaces from .env file');
  process.exit(1);
}

if (hasQuotes) {
  console.error('❌ Keys contain quotes! Remove quotes from .env file');
  process.exit(1);
}

if (hasNewlines) {
  console.error('❌ Keys contain newlines! Check .env file formatting');
  process.exit(1);
}

console.log('✅ Key format looks good');

// Step 3: Initialize Razorpay
console.log('\n🔧 Step 3: Initializing Razorpay Instance');
console.log('-'.repeat(60));

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  console.log('✅ Razorpay instance created successfully');
} catch (error) {
  console.error('❌ Failed to create Razorpay instance:', error.message);
  process.exit(1);
}

// Step 4: Test API call
console.log('\n🌐 Step 4: Testing API Authentication');
console.log('-'.repeat(60));
console.log('Creating a test order for ₹100.00...\n');

razorpay.orders.create({
  amount: 10000, // ₹100 in paise
  currency: 'INR',
  receipt: `test_${Date.now()}`,
  notes: {
    test: 'Verification test order'
  }
})
.then(order => {
  console.log('='.repeat(60));
  console.log('✅ SUCCESS! RAZORPAY IS WORKING CORRECTLY!');
  console.log('='.repeat(60));
  console.log('\n📦 Test Order Created:');
  console.log('   Order ID:', order.id);
  console.log('   Amount:', '₹' + (order.amount / 100).toFixed(2));
  console.log('   Currency:', order.currency);
  console.log('   Status:', order.status);
  console.log('   Created:', new Date(order.created_at * 1000).toLocaleString('en-IN'));
  
  console.log('\n✨ Your Razorpay integration is ready to use!');
  console.log('   You can now accept payments in your application.\n');
  
  process.exit(0);
})
.catch(error => {
  console.log('='.repeat(60));
  console.log('❌ AUTHENTICATION FAILED!');
  console.log('='.repeat(60));
  
  console.log('\n📋 Error Details:');
  console.log('   Status Code:', error.statusCode);
  console.log('   Error Code:', error.error?.code);
  console.log('   Description:', error.error?.description);
  
  console.log('\n🔧 SOLUTION:');
  console.log('-'.repeat(60));
  
  if (error.statusCode === 401) {
    console.log('Your API keys are INVALID or EXPIRED.\n');
    console.log('To fix this:');
    console.log('1. Go to: https://dashboard.razorpay.com/app/keys');
    console.log('2. Click the "Regenerate Key" button');
    console.log('3. Copy BOTH the Key ID and Key Secret');
    console.log('4. Update your .env file:');
    console.log('   RAZORPAY_KEY_ID=<new_key_id>');
    console.log('   RAZORPAY_KEY_SECRET=<new_key_secret>');
    console.log('5. Restart your server');
    console.log('6. Run this test again\n');
    console.log('⚠️  Important: The Key Secret is shown ONLY ONCE!');
    console.log('   Save it immediately after regenerating.\n');
  } else if (error.statusCode === 400) {
    console.log('Bad request - Check your key format\n');
  } else {
    console.log('Unknown error - Check Razorpay dashboard for account status\n');
  }
  
  console.log('Need help? Contact Razorpay support:');
  console.log('https://razorpay.com/support/\n');
  
  process.exit(1);
});