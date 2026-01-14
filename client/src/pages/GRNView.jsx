// ============================================
// FILE: client/src/pages/GRNView.jsx
// CREATE THIS NEW FILE
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  FileText,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';

export default function GRNView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    try {
      const response = await api.get(`/api/grns/${id}`);
      setGrn(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching GRN:', error);
      alert('Failed to load GRN details');
      navigate('/grns');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this GRN?')) return;

    try {
      await api.delete(`/api/grns/${id}`);
      alert('GRN deleted successfully');
      navigate('/grns');
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
        className={`px-3 py-1 text-sm font-medium rounded-full ${
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
        className={`px-3 py-1 text-sm font-medium rounded-full ${
          styles[status] || styles.PENDING
        }`}
      >
        {status?.replace('_', ' ') || 'PENDING'}
      </span>
    );
  };

  const getQualityBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      PASSED: 'bg-green-50 text-green-700 border-green-200',
      FAILED: 'bg-red-50 text-red-700 border-red-200',
      PARTIAL: 'bg-orange-50 text-orange-700 border-orange-200',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded border ${
          styles[status] || styles.PENDING
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!grn) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">GRN not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/grns')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to GRNs
            </button>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {grn.grnNumber}
              </h1>
              {getStatusBadge(grn.status)}
              {getMatchingBadge(grn.matchingStatus)}
            </div>
            <p className="text-gray-600">
              Goods Received Note Details
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/grns/edit/${grn._id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Basic Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Purchase Order</p>
                <p className="font-semibold text-gray-900">{grn.poNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Vendor</p>
                <p className="font-semibold text-gray-900">
                  {grn.vendor?.companyName || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">GRN Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(grn.grnDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Delivery Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(grn.deliveryDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Delivery Location</p>
                <p className="font-semibold text-gray-900">
                  {grn.deliveryLocation || 'Main Warehouse'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Received By</p>
                <p className="font-semibold text-gray-900">
                  {grn.receivedBy?.name || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Ordered</p>
            <p className="text-2xl font-bold text-gray-900">
              {grn.totalOrderedQuantity || 0}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
            <p className="text-sm text-blue-600 mb-1">Received</p>
            <p className="text-2xl font-bold text-blue-900">
              {grn.totalReceivedQuantity || 0}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <p className="text-sm text-green-600 mb-1">Accepted</p>
            <p className="text-2xl font-bold text-green-900">
              {grn.totalAcceptedQuantity || 0}
            </p>
          </div>

          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <p className="text-sm text-red-600 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-900">
              {grn.totalRejectedQuantity || 0}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Items Received</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    HSN
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Ordered
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Received
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Accepted
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Rejected
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    Quality
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grn.items?.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{item.remarks}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {item.hsnSacCode}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {item.orderedQuantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-blue-600">
                      {item.receivedQuantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                      {item.acceptedQuantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                      {item.rejectedQuantity || 0} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getQualityBadge(item.qualityStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matching Info */}
        {grn.linkedInvoice && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold text-green-900">
                Three-Way Matching Complete
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-600 mb-1">Purchase Order</p>
                <p className="font-semibold text-green-900">{grn.poNumber}</p>
              </div>
              <div>
                <p className="text-green-600 mb-1">Goods Received Note</p>
                <p className="font-semibold text-green-900">{grn.grnNumber}</p>
              </div>
              <div>
                <p className="text-green-600 mb-1">Linked Invoice</p>
                <p className="font-semibold text-green-900">
                  {grn.invoiceNumber || 'N/A'}
                </p>
              </div>
            </div>
            {grn.invoiceMatchDate && (
              <p className="text-xs text-green-600 mt-3">
                Matched on: {new Date(grn.invoiceMatchDate).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        )}

        {/* Discrepancies */}
        {grn.hasDiscrepancies && grn.discrepancies?.length > 0 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">
                Discrepancies Found ({grn.discrepancies.length})
              </h2>
            </div>
            <div className="space-y-3">
              {grn.discrepancies.map((disc, index) => (
                <div key={index} className="bg-white rounded p-4 border border-red-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-red-900">{disc.type?.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-700 mt-1">{disc.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      disc.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                      disc.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {disc.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {grn.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{grn.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}