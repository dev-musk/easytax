// ============================================
// FILE: client/src/pages/Invoices.jsx
// ✅ FEATURE #29 & #37: FIXED - Correct routing for create button
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Eye,
  Search,
  Filter,
  ChevronDown,
  FileText,
  X,
} from 'lucide-react';

export default function Invoices({ type }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status) {
      setFilterStatus(status);
    }
  }, [location.search]);

  useEffect(() => {
    fetchInvoices();
  }, [searchTerm, filterStatus]);

  const fetchInvoices = async () => {
    try {
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      if (type) params.invoiceType = type;

      const response = await api.get('/api/invoices', { params });
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Use helper function for routing
  const handleCreateInvoice = () => {
    navigate(getAddInvoiceRoute());
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoices/view/${invoiceId}`);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const filteredInvoices = invoices.filter((invoice) => {
    return filterStatus === 'ALL' || invoice.status === filterStatus;
  });

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  const getPageTitle = () => {
    if (type === 'TAX_INVOICE') return 'Tax Invoices';
    if (type === 'PROFORMA') return 'Pro-Forma Invoices';
    if (type === 'DELIVERY_CHALLAN') return 'Delivery Challans';
    if (type === 'CREDIT_NOTE') return 'Credit Notes';
    if (type === 'DEBIT_NOTE') return 'Debit Notes';
    return 'All Invoices';
  };

  const getAddInvoiceRoute = () => {
    if (type === 'TAX_INVOICE') return '/sales/tax-invoice/add';
    if (type === 'PROFORMA') return '/sales/proforma/add';
    if (type === 'DELIVERY_CHALLAN') return '/sales/delivery-challan/add';
    if (type === 'CREDIT_NOTE') return '/sales/credit-note/add';
    if (type === 'DEBIT_NOTE') return '/sales/debit-note/add';
    return '/invoices/add';
  };

  const getButtonText = () => {
    if (type === 'TAX_INVOICE') return 'New Tax Invoice';
    if (type === 'PROFORMA') return 'New Pro-Forma Invoice';
    if (type === 'DELIVERY_CHALLAN') return 'New Delivery Challan';
    if (type === 'CREDIT_NOTE') return 'New Credit Note';
    if (type === 'DEBIT_NOTE') return 'New Debit Note';
    return 'Create Invoice';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
            <p className="text-gray-600 text-sm mt-1">Manage and track all your invoices</p>
          </div>
          <button
            onClick={handleCreateInvoice}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {getButtonText()}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice #, client, PO #, HSN, items, amounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'ALL' ? 'No invoices found' : 'No invoices yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first invoice to get started'}
              </p>
              {!searchTerm && filterStatus === 'ALL' && (
                <button
                  onClick={handleCreateInvoice}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Invoice
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice._id}
                invoice={invoice}
                statusColors={statusColors}
                onView={handleViewInvoice}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function InvoiceCard({ invoice, statusColors, onView }) {
  const handleView = (e) => {
    e.stopPropagation();
    onView(invoice._id);
  };

  return (
    <div
      onClick={() => onView(invoice._id)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-700">
              {invoice.invoiceNumber || 'DRAFT'}
            </h3>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                statusColors[invoice.status] || statusColors.DRAFT
              }`}
            >
              {invoice.status?.replace('_', ' ')}
            </span>
            
            {invoice.gstFilingStatus?.gstr1Filed && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                GSTR-1 ✓
              </span>
            )}
            {invoice.gstFilingStatus?.gstr3bFiled && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                GSTR-3B ✓
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 font-medium hover:text-blue-600">
            {invoice.client?.companyName || 'Unknown Client'}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {invoice.poNumber && (
              <span>PO: {invoice.poNumber}</span>
            )}
            {invoice.salesPersonName && (
              <span>Sales: {invoice.salesPersonName}</span>
            )}
            {invoice.reverseCharge && (
              <span className="text-orange-600 font-semibold">⚠️ Reverse Charge</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleView}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            title="View invoice details"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Due Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-sm font-bold text-gray-900">
            ₹{invoice.totalAmount?.toLocaleString('en-IN') || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className={`text-sm font-bold ${invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{invoice.balanceAmount?.toLocaleString('en-IN') || 0}
          </p>
        </div>
      </div>

      {invoice.quickNotes?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Latest Note:</p>
          <p className="text-sm text-gray-700 truncate">
            {invoice.quickNotes[invoice.quickNotes.length - 1].note}
          </p>
        </div>
      )}
    </div>
  );
}