// ============================================
// FILE: client/src/pages/AddEditGRN.jsx
// ✅ FEATURE #46: GRN Creation Form - CORRECTED
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  ArrowLeft,
  Save,
  Package,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function AddEditGRN() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);

  const [formData, setFormData] = useState({
    purchaseOrderId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryLocation: 'Main Warehouse',
    items: [],
    notes: '',
  });

  useEffect(() => {
    fetchPurchaseOrders();
    if (isEditing) {
      fetchGRN();
    }
  }, [id]);

  const fetchPurchaseOrders = async () => {
    try {
      // Fetch approved POs that are ready for receiving
      const response = await api.get('/api/purchase-orders', {
        params: { status: 'APPROVED' }
      });
      setPurchaseOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const fetchGRN = async () => {
    try {
      const response = await api.get(`/api/grns/${id}`);
      const grn = response.data;

      setFormData({
        purchaseOrderId: grn.purchaseOrder?._id || '',
        deliveryDate: grn.deliveryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        deliveryLocation: grn.deliveryLocation || 'Main Warehouse',
        items: grn.items.map(item => ({
          poItemId: item.poItem,
          description: item.description,
          hsnSacCode: item.hsnSacCode || '',
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity || 0,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          qualityStatus: item.qualityStatus || 'PENDING',
          remarks: item.remarks || '',
        })),
        notes: grn.notes || '',
      });

      setSelectedPO(grn.purchaseOrder);
    } catch (error) {
      console.error('Error fetching GRN:', error);
      alert('Failed to fetch GRN details');
      navigate('/grns');
    }
  };

  const handlePOSelect = async (poId) => {
    if (!poId) {
      setSelectedPO(null);
      setFormData(prev => ({ ...prev, purchaseOrderId: '', items: [] }));
      return;
    }

    try {
      const response = await api.get(`/api/purchase-orders/${poId}`);
      const po = response.data;

      setSelectedPO(po);
      
      // Pre-fill items from PO
      setFormData(prev => ({
        ...prev,
        purchaseOrderId: poId,
        items: po.items.map(item => ({
          poItemId: item._id,
          description: item.description,
          hsnSacCode: item.hsnSacCode || '',
          orderedQuantity: item.quantity,
          receivedQuantity: item.quantity, // Default to full quantity
          acceptedQuantity: item.quantity, // Default to full quantity
          rejectedQuantity: 0,
          unit: item.unit,
          rate: item.rate,
          amount: item.quantity * item.rate,
          qualityStatus: 'PENDING',
          remarks: '',
        })),
      }));
    } catch (error) {
      console.error('Error fetching PO details:', error);
      alert('Failed to load Purchase Order details');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-calculate amounts
    if (['receivedQuantity', 'acceptedQuantity', 'rejectedQuantity'].includes(field)) {
      const item = newItems[index];
      
      // If received quantity changes, update accepted quantity to match
      if (field === 'receivedQuantity') {
        const numValue = parseFloat(value) || 0;
        item.receivedQuantity = numValue;
        item.acceptedQuantity = numValue;
        item.rejectedQuantity = 0;
      }

      // If accepted or rejected changes, ensure they add up to received
      if (field === 'acceptedQuantity') {
        const accepted = parseFloat(value) || 0;
        const received = item.receivedQuantity;
        
        if (accepted > received) {
          alert('Accepted quantity cannot exceed received quantity');
          return;
        }
        
        item.acceptedQuantity = accepted;
        item.rejectedQuantity = received - accepted;
      }
      
      if (field === 'rejectedQuantity') {
        const rejected = parseFloat(value) || 0;
        const received = item.receivedQuantity;
        
        if (rejected > received) {
          alert('Rejected quantity cannot exceed received quantity');
          return;
        }
        
        item.rejectedQuantity = rejected;
        item.acceptedQuantity = received - rejected;
      }

      // Recalculate amount based on accepted quantity
      item.amount = item.acceptedQuantity * item.rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate items
      for (const item of formData.items) {
        if (item.receivedQuantity > item.orderedQuantity) {
          alert(`Received quantity cannot exceed ordered quantity for ${item.description}`);
          setLoading(false);
          return;
        }

        const total = item.acceptedQuantity + item.rejectedQuantity;
        if (Math.abs(total - item.receivedQuantity) > 0.01) {
          alert(`Accepted (${item.acceptedQuantity}) + Rejected (${item.rejectedQuantity}) must equal Received (${item.receivedQuantity}) for ${item.description}`);
          setLoading(false);
          return;
        }
      }

      const grnData = {
        purchaseOrderId: formData.purchaseOrderId,
        deliveryDate: formData.deliveryDate,
        deliveryLocation: formData.deliveryLocation,
        items: formData.items,
        notes: formData.notes,
      };

      console.log('Submitting GRN:', grnData);

      if (isEditing) {
        await api.put(`/api/grns/${id}`, grnData);
        alert('GRN updated successfully');
      } else {
        await api.post('/api/grns', grnData);
        alert('GRN created successfully');
      }

      navigate('/grns');
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert(error.response?.data?.error || 'Failed to save GRN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/grns')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to GRNs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit GRN' : 'Create Goods Received Note'}
          </h1>
          <p className="text-gray-600 mt-1">
            Record delivery and quality inspection details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Order <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={isEditing}
                  value={formData.purchaseOrderId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Purchase Order</option>
                  {purchaseOrders.map((po) => (
                    <option key={po._id} value={po._id}>
                      {po.poNumber} - {po.vendor?.companyName} (₹{(po.totalValue || po.totalAmount || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                {purchaseOrders.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No approved purchase orders found. Create and approve a PO first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location
                </label>
                <input
                  type="text"
                  value={formData.deliveryLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryLocation: e.target.value })
                  }
                  placeholder="e.g., Main Warehouse, Godown A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* PO Details (if selected) */}
          {selectedPO && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Purchase Order Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600">PO Number:</span>{' '}
                  <span className="font-medium">{selectedPO.poNumber}</span>
                </div>
                <div>
                  <span className="text-blue-600">Vendor:</span>{' '}
                  <span className="font-medium">{selectedPO.vendor?.companyName}</span>
                </div>
                <div>
                  <span className="text-blue-600">PO Date:</span>{' '}
                  <span className="font-medium">
                    {new Date(selectedPO.poDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Total Amount:</span>{' '}
                  <span className="font-medium">
                    ₹{(selectedPO.totalValue || selectedPO.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Items Received
              </h2>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.description}
                        </h3>
                        <p className="text-sm text-gray-600">
                          HSN: {item.hsnSacCode} | Rate: ₹{item.rate} per {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Ordered Qty
                        </label>
                        <input
                          type="number"
                          disabled
                          value={item.orderedQuantity}
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Received Qty <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          max={item.orderedQuantity}
                          step="0.01"
                          value={item.receivedQuantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'receivedQuantity',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">
                          Accepted Qty <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          max={item.receivedQuantity}
                          step="0.01"
                          value={item.acceptedQuantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'acceptedQuantity',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-green-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-red-700 mb-1">
                          Rejected Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.receivedQuantity}
                          step="0.01"
                          value={item.rejectedQuantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'rejectedQuantity',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-red-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quality Status
                        </label>
                        <select
                          value={item.qualityStatus}
                          onChange={(e) =>
                            handleItemChange(index, 'qualityStatus', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PASSED">Passed</option>
                          <option value="FAILED">Failed</option>
                          <option value="PARTIAL">Partial</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Remarks / Quality Notes
                      </label>
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) =>
                          handleItemChange(index, 'remarks', e.target.value)
                        }
                        placeholder="Any quality issues, damages, or special notes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Discrepancy Warnings */}
                    {item.receivedQuantity < item.orderedQuantity && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span className="text-sm text-orange-700">
                          Short delivery: {(item.orderedQuantity - item.receivedQuantity).toFixed(2)} {item.unit} short
                        </span>
                      </div>
                    )}

                    {item.rejectedQuantity > 0 && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm text-red-700">
                          Quality issue: {item.rejectedQuantity.toFixed(2)} {item.unit} rejected
                        </span>
                      </div>
                    )}

                    {item.acceptedQuantity === item.orderedQuantity && item.rejectedQuantity === 0 && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700">
                          Full quantity received and accepted
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Delivery notes, packaging condition, transporter details, etc."
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => navigate('/grns')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.purchaseOrderId || formData.items.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Update GRN' : 'Create GRN'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}