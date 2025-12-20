// ============================================
// FILE: client/src/pages/InvoiceView.jsx
// FIXED - Works without /api/organizations/me endpoint
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import {
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      console.log('Fetching invoice:', id); // Debug log
      const response = await api.get(`/api/invoices/${id}`);
      console.log('Invoice data:', response.data); // Debug log
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      console.error('Error details:', error.response); // More debug info
      setError(error.response?.data?.error || 'Failed to load invoice');
      // Don't navigate away immediately, show error
      setTimeout(() => {
        if (window.confirm('Failed to load invoice. Return to invoices list?')) {
          navigate('/invoices');
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = function () {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Invoice</h3>
            <p className="text-gray-600 mb-6">{error || 'Invoice not found'}</p>
            <button
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex items-center gap-3">
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Record Payment
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 print:shadow-none print:border-0">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {invoice.invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
              </h1>
              <p className="text-sm text-gray-600">
                Invoice Number: <span className="font-semibold">{invoice.invoiceNumber}</span>
              </p>
            </div>
            <div>
              <span
                className={`px-4 py-2 text-sm font-medium rounded-full ${
                  statusColors[invoice.status]
                }`}
              >
                {invoice.status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
              <div className="space-y-1">
                <p className="font-bold text-gray-900">{invoice.client?.companyName}</p>
                {invoice.client?.billingAddress && (
                  <p className="text-sm text-gray-600">{invoice.client.billingAddress}</p>
                )}
                {invoice.client?.billingCity && invoice.client?.billingState && (
                  <p className="text-sm text-gray-600">
                    {invoice.client.billingCity}, {invoice.client.billingState}
                  </p>
                )}
                {invoice.client?.gstin && (
                  <p className="text-sm text-gray-600">GSTIN: {invoice.client.gstin}</p>
                )}
                {invoice.client?.email && (
                  <p className="text-sm text-gray-600">Email: {invoice.client.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Due Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
              <p className="font-semibold text-gray-900">
                {Math.ceil(
                  (new Date(invoice.dueDate) - new Date(invoice.invoiceDate)) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                Days
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    #
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Description
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    HSN/SAC
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Qty
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Rate
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    GST%
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.hsnSacCode || '-'}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">
                      ₹{item.rate?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.gstRate}%
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                      ₹{item.amount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{invoice.subtotal?.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    Discount
                    {invoice.discountType === 'PERCENTAGE'
                      ? ` (${invoice.discountValue}%)`
                      : ''}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    - ₹{invoice.discountAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.cgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">CGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.cgst?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.sgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">SGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.sgst?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.igst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">IGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.igst?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Round Off</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.roundOff?.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 border-t-2 border-gray-300">
                <span className="text-base font-bold text-gray-900">Total Amount</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Paid Amount</span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{invoice.paidAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-bold text-gray-900">Balance Due</span>
                    <span className="text-sm font-bold text-red-600">
                      ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchInvoiceDetails();
          }}
        />
      )}
    </Layout>
  );
}

function PaymentModal({ invoice, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: invoice.balanceAmount || 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (formData.amount > invoice.balanceAmount) {
      setError('Payment amount cannot exceed balance amount');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/invoices/${invoice._id}/payments`, formData);
      alert('Payment recorded successfully!');
      onSuccess();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice Info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-gray-900">
                ₹{invoice.totalAmount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-semibold text-green-600">
                ₹{invoice.paidAmount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="text-gray-600">Balance Due:</span>
              <span className="font-bold text-red-600">
                ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="Transaction ID, Cheque No, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}