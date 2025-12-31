// ============================================
// FILE: client/src/pages/ViewQuotation.jsx
// PHASE 4: View Quotation Details
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  ArrowRight,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function ViewQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/quotations/${id}`);
      setQuotation(response.data);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      alert('Failed to fetch quotation details');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/quotations/${id}`);
      alert('Quotation deleted successfully!');
      navigate('/quotations');
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert(error.response?.data?.error || 'Failed to delete quotation');
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const response = await api.post(`/api/quotations/${id}/convert-to-invoice`);
      alert('Quotation converted to invoice successfully!');
      navigate(`/invoices/view/${response.data.invoice._id}`);
    } catch (error) {
      console.error('Error converting quotation:', error);
      alert(error.response?.data?.error || 'Failed to convert quotation');
    }
  };

  const handleDownloadPDF = () => {
    // Open quotation PDF in new tab
    window.open(`/api/quotations/${id}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!quotation) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Quotation not found</p>
        </div>
      </Layout>
    );
  }

  const isExpired = new Date(quotation.validUntil) < new Date();
  const canConvert = !quotation.convertedToInvoice && !isExpired && quotation.status !== 'REJECTED';

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    CONVERTED: 'bg-purple-100 text-purple-700',
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/quotations')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
              <p className="text-gray-600 mt-1">Quotation Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 text-sm font-medium rounded-lg ${statusColors[quotation.status]}`}>
              {quotation.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          {!quotation.convertedToInvoice && (
            <button
              onClick={() => navigate(`/quotations/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {canConvert && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Convert to Invoice
            </button>
          )}
          {!quotation.convertedToInvoice && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>

        {/* Conversion Alert */}
        {quotation.convertedToInvoice && quotation.invoiceId && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900">Converted to Invoice</p>
                <p className="text-sm text-purple-700 mt-1">
                  This quotation was converted to invoice <strong>{quotation.invoiceId.invoiceNumber}</strong> on{' '}
                  {new Date(quotation.convertedAt).toLocaleDateString('en-IN')}
                </p>
                <button
                  onClick={() => navigate(`/invoices/view/${quotation.invoiceId._id}`)}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2"
                >
                  View Invoice →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expiry Alert */}
        {isExpired && !quotation.convertedToInvoice && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Quotation Expired</p>
                <p className="text-sm text-orange-700 mt-1">
                  This quotation expired on {new Date(quotation.validUntil).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900">
              ₹{quotation.totalAmount?.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Quotation Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(quotation.quotationDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Valid Until</p>
            <p className={`text-lg font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(quotation.validUntil).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Client Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="font-medium text-gray-900">{quotation.client?.companyName}</p>
              </div>
            </div>
            {quotation.client?.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{quotation.client.email}</p>
                </div>
              </div>
            )}
            {quotation.client?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{quotation.client.phone}</p>
                </div>
              </div>
            )}
            {quotation.client?.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">
                    {quotation.client.address}, {quotation.client.city}, {quotation.client.state} - {quotation.client.pincode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HSN/SAC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotation.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-500">{item.unit}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{item.hsnSacCode}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      ₹{item.rate?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{item.gstRate}%</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ₹{item.totalAmount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">
                ₹{quotation.subtotal?.toLocaleString('en-IN')}
              </span>
            </div>
            {quotation.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Discount {quotation.discountType === 'PERCENTAGE' ? `(${quotation.discountValue}%)` : ''}:
                </span>
                <span className="font-medium text-red-600">
                  -₹{quotation.discountAmount?.toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600">Taxable Amount:</span>
              <span className="font-medium text-gray-900">
                ₹{(quotation.subtotal - (quotation.discountAmount || 0)).toLocaleString('en-IN')}
              </span>
            </div>
            {quotation.cgst > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CGST:</span>
                  <span className="font-medium text-gray-900">₹{quotation.cgst?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SGST:</span>
                  <span className="font-medium text-gray-900">₹{quotation.sgst?.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
            {quotation.igst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IGST:</span>
                <span className="font-medium text-gray-900">₹{quotation.igst?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Tax:</span>
              <span className="font-medium text-gray-900">₹{quotation.totalTax?.toLocaleString('en-IN')}</span>
            </div>
            {quotation.roundOff !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Round Off:</span>
                <span className="font-medium text-gray-900">
                  {quotation.roundOff > 0 ? '+' : ''}₹{quotation.roundOff?.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-300">
              <span>Total Amount:</span>
              <span className="text-blue-600">₹{quotation.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(quotation.notes || quotation.termsConditions) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotation.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
            {quotation.termsConditions && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.termsConditions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Quotation</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this quotation? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Convert to Invoice</h3>
                <p className="text-gray-600 mb-6">
                  This will create a new invoice based on this quotation. The quotation will be marked as converted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConvertModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvertToInvoice}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Convert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}