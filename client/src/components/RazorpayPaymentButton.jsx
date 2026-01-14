// ============================================
// FILE: client/src/components/RazorpayPaymentButton.jsx
// ✅ RAZORPAY INTEGRATION COMPONENT
// ============================================

import { useState } from 'react';
import api from '../utils/api';
import { CreditCard, Loader } from 'lucide-react';

export default function RazorpayPaymentButton({ invoice, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if script already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        setLoading(false);
        return;
      }

      // Create Razorpay order
      const { data } = await api.post('/api/payments/create-order', {
        invoiceId: invoice._id,
      });

      if (!data.success) {
        alert('Failed to create payment order');
        setLoading(false);
        return;
      }

      // Configure Razorpay options
      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'EasyTax ERP',
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        order_id: data.order.id,
        
        // Customer details
        prefill: {
          name: invoice.client?.companyName || '',
          email: invoice.client?.email || '',
          contact: invoice.client?.phone || '',
        },

        // Notes
        notes: {
          invoice_id: invoice._id,
          invoice_number: invoice.invoiceNumber,
        },

        // Theme
        theme: {
          color: '#2563eb', // Blue color
        },

        // Success handler
        handler: async function (response) {
          try {
            // Verify payment on backend
            const verifyResponse = await api.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: invoice._id,
            });

            if (verifyResponse.data.success) {
              alert('✅ Payment successful!');
              if (onSuccess) onSuccess();
            } else {
              alert('❌ Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Failed to verify payment. Please contact support with payment ID: ' + response.razorpay_payment_id);
          } finally {
            setLoading(false);
          }
        },

        // Modal close handler
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('Payment cancelled by user');
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      alert(error.response?.data?.error || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || invoice.balanceAmount <= 0}
      className="flex flex-col items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span className="text-xs">Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <span className="text-xs">Pay Online</span>
        </>
      )}
    </button>
  );
}