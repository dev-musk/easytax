// ============================================
// FILE: client/src/pages/PurchaseOrders.jsx
// ✅ FEATURE #16: PO Management - WITH APPROVE BUTTON
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  FileText,
  X,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPOs();
    fetchStats();
  }, [searchTerm, filterStatus]);

  const fetchPOs = async () => {
    try {
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/api/purchase-orders', { params });
      setPOs(response.data || []);
    } catch (error) {
      console.error('Error fetching POs:', error);
      alert('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/purchase-orders/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreatePO = () => {
    navigate('/purchase-orders/add');
  };

  const handleViewPO = (poId) => {
    navigate(`/purchase-orders/view/${poId}`);
  };

  const handleApprovePO = async (poId, e) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to approve this Purchase Order?')) {
      return;
    }

    try {
      await api.patch(`/api/purchase-orders/${poId}/approve`);
      alert('Purchase Order approved successfully');
      fetchPOs();
      fetchStats();
    } catch (error) {
      console.error('Error approving PO:', error);
      alert(error.response?.data?.error || 'Failed to approve Purchase Order');
    }
  };

  const handleCancelPO = async (poId, e) => {
    e.stopPropagation();
    
    const reason = prompt('Enter reason for cancellation (optional):');
    if (reason === null) return; // User clicked cancel

    try {
      await api.patch(`/api/purchase-orders/${poId}/cancel`, { reason });
      alert('Purchase Order cancelled successfully');
      fetchPOs();
      fetchStats();
    } catch (error) {
      console.error('Error cancelling PO:', error);
      alert(error.response?.data?.error || 'Failed to cancel Purchase Order');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    RECEIVING: 'bg-blue-100 text-blue-700',
    PARTIALLY_RECEIVED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage and track all purchase orders
            </p>
          </div>
          <button
            onClick={handleCreatePO}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Purchase Order
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total POs</p>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalPOs}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Value</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                ₹{stats.totalValue?.toLocaleString('en-IN') || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending Approval</p>
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.stats?.find((s) => s._id === 'PENDING')?.count || 0}
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by PO#, vendor, items..."
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
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="RECEIVING">Receiving</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Received</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* PO List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'No purchase orders found'
                  : 'No purchase orders yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first purchase order to get started'}
              </p>
              {!searchTerm && filterStatus === 'ALL' && (
                <button
                  onClick={handleCreatePO}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First PO
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pos.map((po) => (
              <POCard
                key={po._id}
                po={po}
                statusColors={statusColors}
                onView={handleViewPO}
                onApprove={handleApprovePO}
                onCancel={handleCancelPO}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function POCard({ po, statusColors, onView, onApprove, onCancel }) {
  return (
    <div
      onClick={() => onView(po._id)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-700">
              {po.poNumber}
            </h3>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                statusColors[po.status] || statusColors.PENDING
              }`}
            >
              {po.status?.replace('_', ' ')}
            </span>
          </div>

          <p className="text-sm text-gray-600 font-medium hover:text-blue-600">
            {po.vendor?.companyName || 'Unknown Vendor'}
          </p>

          {po.expectedDeliveryDate && (
            <p className="text-xs text-gray-500 mt-1">
              Expected:{' '}
              {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}
            </p>
          )}

          {po.approvedBy && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Approved by {po.approvedBy.name} on{' '}
              {new Date(po.approvedAt).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Approve Button - Only show for PENDING or DRAFT status */}
          {(po.status === 'PENDING' || po.status === 'DRAFT') && (
            <button
              onClick={(e) => onApprove(po._id, e)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              title="Approve PO"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}

          {/* Cancel Button - Don't show for already cancelled or received POs */}
          {!['CANCELLED', 'RECEIVED', 'PAID'].includes(po.status) && (
            <button
              onClick={(e) => onCancel(po._id, e)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              title="Cancel PO"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(po._id);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            title="View details"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">PO Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(po.poDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-sm font-bold text-gray-900">
            ₹{po.totalValue?.toLocaleString('en-IN') || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Paid Amount</p>
          <p className="text-sm font-bold text-green-600">
            ₹{po.paidAmount?.toLocaleString('en-IN') || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p
            className={`text-sm font-bold ${
              po.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            ₹{po.balanceAmount?.toLocaleString('en-IN') || 0}
          </p>
        </div>
      </div>

      {po.linkedInvoices?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Linked Invoices:</p>
          <div className="flex flex-wrap gap-2">
            {po.linkedInvoices.map((link, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
              >
                {link.invoiceNumber}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}