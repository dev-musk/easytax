// ============================================
// FILE: client/src/pages/Invoices.jsx
// PHASE 4 - With Duplicate Invoice Feature
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  Trash2,
  ChevronDown,
  FileText,
  Copy, // ✅ PHASE 4: Added for duplicate
} from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/api/invoices');
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    navigate('/invoices/add');
  };

  const handleViewInvoice = (invoice) => {
    navigate(`/invoices/view/${invoice._id}`);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await api.delete(`/api/invoices/${invoiceId}`);
      setInvoices(invoices.filter((inv) => inv._id !== invoiceId));
      alert('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  // ✅ PHASE 4: Duplicate Invoice Handler
  const handleDuplicate = async (invoiceId) => {
    if (!confirm('Create a duplicate of this invoice?')) return;

    try {
      const response = await api.get(`/api/invoices/${invoiceId}`);
      const invoice = response.data;

      // Navigate to create page with pre-filled data
      navigate('/invoices/add', {
        state: {
          duplicateFrom: invoice,
          isDuplicate: true,
        },
      });
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      alert('Failed to duplicate invoice');
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 text-sm mt-1">Manage and track all your invoices</p>
          </div>
          <button
            onClick={handleCreateInvoice}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                  ? 'Try adjusting your filters'
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
                onDelete={handleDeleteInvoice}
                onDuplicate={handleDuplicate} // ✅ PHASE 4: Pass duplicate handler
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function InvoiceCard({ invoice, statusColors, onView, onDelete, onDuplicate }) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/api/invoices/${invoice._id}/pdf`, {
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
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    const recipientEmail = prompt('Enter recipient email address:', invoice.client?.email || '');

    if (!recipientEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setSending(true);
    try {
      await api.post(`/api/invoices/${invoice._id}/send-email`, {
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber}`,
        message: 'Please find attached invoice for your reference.',
      });

      alert(`Invoice sent successfully to ${recipientEmail}!`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.invoiceNumber || 'DRAFT'}
            </h3>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                statusColors[invoice.status] || statusColors.DRAFT
              }`}
            >
              {invoice.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600">{invoice.client?.companyName || 'Unknown Client'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(invoice)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View invoice"
          >
            <Eye className="w-4 h-4" />
          </button>
          {/* ✅ PHASE 4: Duplicate Button */}
          <button
            onClick={() => onDuplicate(invoice._id)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Duplicate invoice"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title={downloading ? 'Generating PDF...' : 'Download PDF'}
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
            title={sending ? 'Sending...' : 'Send email'}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Mail className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(invoice._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete invoice"
          >
            <Trash2 className="w-4 h-4" />
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
          <p className="text-sm font-bold text-red-600">
            ₹{invoice.balanceAmount?.toLocaleString('en-IN') || 0}
          </p>
        </div>
      </div>
    </div>
  );
}