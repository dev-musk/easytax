// ============================================
// FILE: client/src/pages/Quotations.jsx
// PHASE 4: Quotations List Page
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Edit,
  Trash2,
  X,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [filteredQuotations, setFilteredQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quotationToConvert, setQuotationToConvert] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  useEffect(() => {
    filterQuotations();
  }, [quotations, searchTerm]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/api/quotations?${params.toString()}`);
      setQuotations(response.data);
      setFilteredQuotations(response.data);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotations = () => {
    let filtered = [...quotations];

    if (searchTerm) {
      filtered = filtered.filter(
        (quotation) =>
          quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quotation.client?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredQuotations(filtered);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/quotations/${quotationToDelete}`);
      fetchQuotations();
      setShowDeleteModal(false);
      setQuotationToDelete(null);
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert(error.response?.data?.error || 'Failed to delete quotation');
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const response = await api.post(`/api/quotations/${quotationToConvert}/convert-to-invoice`);
      alert('Quotation converted to invoice successfully!');
      setShowConvertModal(false);
      setQuotationToConvert(null);
      fetchQuotations();
      // Navigate to the created invoice
      navigate(`/invoices/view/${response.data.invoice._id}`);
    } catch (error) {
      console.error('Error converting quotation:', error);
      alert(error.response?.data?.error || 'Failed to convert quotation');
    }
  };

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    CONVERTED: 'bg-purple-100 text-purple-700',
  };

  const statusCounts = {
    ALL: quotations.length,
    DRAFT: quotations.filter((q) => q.status === 'DRAFT').length,
    SENT: quotations.filter((q) => q.status === 'SENT').length,
    ACCEPTED: quotations.filter((q) => q.status === 'ACCEPTED').length,
    REJECTED: quotations.filter((q) => q.status === 'REJECTED').length,
    EXPIRED: quotations.filter((q) => q.status === 'EXPIRED').length,
    CONVERTED: quotations.filter((q) => q.status === 'CONVERTED').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-600 mt-1">Manage your quotations and convert to invoices</p>
          </div>
          <button
            onClick={() => navigate('/quotations/add')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Quotation
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                statusFilter === status
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600 mt-1">
                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
              </p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by quotation number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Quotations List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotations Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first quotation'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate('/quotations/add')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Quotation
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQuotations.map((quotation) => (
              <QuotationCard
                key={quotation._id}
                quotation={quotation}
                onDelete={(id) => {
                  setQuotationToDelete(id);
                  setShowDeleteModal(true);
                }}
                onConvert={(id) => {
                  setQuotationToConvert(id);
                  setShowConvertModal(true);
                }}
                onView={(id) => navigate(`/quotations/view/${id}`)}
                onEdit={(id) => navigate(`/quotations/edit/${id}`)}
                statusColors={statusColors}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Invoice Modal */}
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvertToInvoice}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

function QuotationCard({ quotation, onDelete, onConvert, onView, onEdit, statusColors }) {
  const isExpired = new Date(quotation.validUntil) < new Date();
  const canConvert = !quotation.convertedToInvoice && !isExpired && quotation.status !== 'REJECTED';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{quotation.quotationNumber}</h3>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[quotation.status]}`}>
              {quotation.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600">{quotation.client?.companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">₹{quotation.totalAmount?.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(quotation.quotationDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Valid Until</p>
          <p className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(quotation.validUntil).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Items</p>
          <p className="text-sm font-medium text-gray-900">{quotation.items?.length || 0}</p>
        </div>
      </div>

      {quotation.convertedToInvoice && quotation.invoiceId && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            Converted to Invoice: <strong>{quotation.invoiceId.invoiceNumber}</strong>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => onView(quotation._id)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        {!quotation.convertedToInvoice && (
          <button
            onClick={() => onEdit(quotation._id)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        )}
        {canConvert && (
          <button
            onClick={() => onConvert(quotation._id)}
            className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors ml-auto"
          >
            <ArrowRight className="w-4 h-4" />
            Convert to Invoice
          </button>
        )}
        {!quotation.convertedToInvoice && (
          <button
            onClick={() => onDelete(quotation._id)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}