// ============================================
// FILE: client/src/pages/PublicInvoiceView.jsxx
// ============================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, AlertCircle, Eye } from 'lucide-react';

export default function PublicInvoiceView() {
  const { shareToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicInvoice();
  }, [shareToken]);

  const fetchPublicInvoice = async () => {
    try {
      // NO AUTH - Direct axios call
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/invoices/public/${shareToken}`
      );
      
      setData(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.error || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Invoice Not Found
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            This link may have expired or been disabled. Please contact the sender for a valid link.
          </p>
        </div>
      </div>
    );
  }

  const { invoice, organization } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Shared Invoice
              </h1>
              <p className="text-blue-100 mt-1">From {organization.name}</p>
            </div>
            {invoice.shareViews > 0 && (
              <div className="text-right">
                <p className="text-sm text-blue-100">Views</p>
                <p className="text-2xl font-bold">{invoice.shareViews}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-b-lg shadow-lg p-8">
          {/* Company Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-500">
            <div>
              {organization.logo && (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${organization.logo}`}
                  alt="Company Logo"
                  className="h-16 w-auto object-contain mb-4"
                />
              )}
              <h2 className="text-2xl font-bold text-blue-600 mb-2">
                {organization.name}
              </h2>
              <p className="text-sm text-gray-600">{organization.address}</p>
              <p className="text-sm text-gray-600">
                {organization.city}, {organization.state} - {organization.pincode}
              </p>
              {organization.gstin && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>GSTIN:</strong> {organization.gstin}
                </p>
              )}
            </div>

            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                TAX INVOICE
              </h3>
              <p className="text-sm text-gray-600">
                Invoice #: <strong>{invoice.invoiceNumber}</strong>
              </p>
              <span className={`mt-2 inline-block px-3 py-1 text-xs font-medium rounded-full ${
                invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Bill To:</h4>
            <p className="font-bold text-gray-900">{invoice.client.companyName}</p>
            <p className="text-sm text-gray-600">{invoice.client.billingAddress}</p>
            <p className="text-sm text-gray-600">
              {invoice.client.billingCity}, {invoice.client.billingState}
            </p>
            {invoice.client.gstin && (
              <p className="text-sm text-gray-600 mt-2">
                <strong>GSTIN:</strong> {invoice.client.gstin}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-sm text-gray-600">Invoice Date</p>
              <p className="font-semibold">
                {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="font-semibold">
                {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">#</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Description</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Qty</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Rate</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-2 text-sm">{index + 1}</td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">HSN: {item.hsnSacCode}</p>
                    </td>
                    <td className="py-3 px-2 text-center text-sm">{item.quantity}</td>
                    <td className="py-3 px-2 text-right text-sm">
                      ₹{item.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-96 space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium">
                  ₹{invoice.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              
              {invoice.cgst > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CGST</span>
                    <span className="text-sm">₹{invoice.cgst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">SGST</span>
                    <span className="text-sm">₹{invoice.sgst.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
              
              {invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">IGST</span>
                  <span className="text-sm">₹{invoice.igst.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between py-3 border-t-2 border-gray-300 bg-blue-600 text-white px-4 rounded-lg">
                <span className="font-bold">Total Amount</span>
                <span className="text-xl font-bold">
                  ₹{invoice.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.balanceAmount > 0 && (
                <div className="flex justify-between py-2 bg-red-50 px-4 rounded-lg">
                  <span className="text-sm font-bold text-red-900">Balance Due</span>
                  <span className="text-sm font-bold text-red-600">
                    ₹{invoice.balanceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {organization.bankDetails && (
            <div className="mb-8 bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Bank Details for Payment</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Bank Name:</span>
                  <span className="ml-2 font-semibold">{organization.bankDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Account Number:</span>
                  <span className="ml-2 font-semibold">{organization.bankDetails.accountNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">IFSC Code:</span>
                  <span className="ml-2 font-semibold">{organization.bankDetails.ifscCode}</span>
                </div>
                {organization.bankDetails.upiId && (
                  <div>
                    <span className="text-gray-600">UPI ID:</span>
                    <span className="ml-2 font-semibold">{organization.bankDetails.upiId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8 pt-6 border-t">
            <p>This is a computer generated invoice and does not require a physical signature.</p>
            <p className="mt-2">Powered by EasyTax ERP</p>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}