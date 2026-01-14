// ============================================
// FILE: client/src/pages/GRNList.jsx
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Package,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GRNList() {
  const navigate = useNavigate();
  const [grns, setGrns] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchGRNs();
    fetchDashboard();
  }, []);

  const fetchGRNs = async () => {
    try {
      const response = await api.get('/api/grns');
      setGrns(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/three-way-matching/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this GRN?')) return;

    try {
      await api.delete(`/api/grns/${id}`);
      alert('GRN deleted successfully');
      fetchGRNs();
    } catch (error) {
      console.error('Error deleting GRN:', error);
      alert('Failed to delete GRN');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      RECEIVED: 'bg-blue-100 text-blue-800',
      INSPECTED: 'bg-purple-100 text-purple-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] || styles.DRAFT
        }`}
      >
        {status}
      </span>
    );
  };

  const getMatchingBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      MATCHED: 'bg-green-100 text-green-800',
      PARTIALLY_MATCHED: 'bg-orange-100 text-orange-800',
      MISMATCHED: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] || styles.PENDING
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredGRNs = grns.filter((grn) => {
    const matchesSearch =
      grn.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || grn.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Goods Received Notes (GRN)
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Track deliveries and match with POs & Invoices
            </p>
          </div>
          <button
            onClick={() => navigate('/grns/add')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create GRN
          </button>
        </div>

        {/* Three-Way Matching Dashboard */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total GRNs</p>
              <p className="text-2xl font-bold text-gray-900">{dashboard.totalGRNs}</p>
            </div>

            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
              <p className="text-sm text-green-600 mb-1">Matched</p>
              <p className="text-2xl font-bold text-green-900">
                {dashboard.matchedGRNs}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {dashboard.matchRate}% match rate
              </p>
            </div>

            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
              <p className="text-sm text-red-600 mb-1">Mismatched</p>
              <p className="text-2xl font-bold text-red-900">
                {dashboard.mismatchedGRNs}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
              <p className="text-sm text-yellow-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {dashboard.pendingMatches}
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by GRN#, PO#, or Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="RECEIVED">Received</option>
              <option value="INSPECTED">Inspected</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="PARTIAL">Partial</option>
            </select>
          </div>
        </div>

        {/* GRN List */}
        {filteredGRNs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No GRNs found</p>
            <button
              onClick={() => navigate('/grns/add')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first GRN
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredGRNs.map((grn) => (
              <div
                key={grn._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {grn.grnNumber}
                      </h3>
                      {getStatusBadge(grn.status)}
                      {getMatchingBadge(grn.matchingStatus)}
                    </div>
                    <p className="text-sm text-gray-600">
                      PO: {grn.poNumber} | Vendor: {grn.vendor?.companyName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Delivery Date:{' '}
                      {new Date(grn.deliveryDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/grns/view/${grn._id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => navigate(`/grns/edit/${grn._id}`)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(grn._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Ordered</p>
                    <p className="font-medium text-gray-900">
                      {grn.totalOrderedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Received</p>
                    <p className="font-medium text-blue-600">
                      {grn.totalReceivedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Accepted</p>
                    <p className="font-medium text-green-600">
                      {grn.totalAcceptedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Rejected</p>
                    <p className="font-medium text-red-600">
                      {grn.totalRejectedQuantity || 0}
                    </p>
                  </div>
                </div>

                {/* Discrepancies Warning */}
                {grn.hasDiscrepancies && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      {grn.discrepancies?.length || 0} discrepancy(ies) found
                    </p>
                    <button
                      onClick={() => navigate(`/grns/view/${grn._id}`)}
                      className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                )}

                {/* Linked Invoice */}
                {grn.invoiceNumber && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700">
                      Matched with Invoice: {grn.invoiceNumber}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}