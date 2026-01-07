// ============================================
// FILE: client/src/pages/AddEditPO.jsx
// ✅ FEATURE #16: PO Create/Edit Form
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { ArrowLeft, Save, Plus, Minus } from 'lucide-react';

export default function AddEditPO() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);

  const [formData, setFormData] = useState({
    vendorId: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    deliveryAddress: '',
    items: [
      {
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        amount: 0,
      },
    ],
    notes: '',
    termsConditions: '',
    status: 'PENDING',
  });

  useEffect(() => {
    fetchVendors();
    if (isEditing) {
      fetchPO();
    }
  }, [id]);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/api/clients');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchPO = async () => {
    try {
      const response = await api.get(`/api/purchase-orders/${id}`);
      const po = response.data;
      
      setFormData({
        vendorId: po.vendor?._id || '',
        poDate: po.poDate?.split('T')[0],
        expectedDeliveryDate: po.expectedDeliveryDate?.split('T')[0] || '',
        deliveryAddress: po.deliveryAddress || '',
        items: po.items?.map((item) => ({
          description: item.description,
          hsnSacCode: item.hsnSacCode || '',
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
        })) || [],
        notes: po.notes || '',
        termsConditions: po.termsConditions || '',
        status: po.status,
      });
    } catch (error) {
      console.error('Error fetching PO:', error);
      alert('Failed to fetch PO details');
      navigate('/purchase-orders');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: '',
          hsnSacCode: '',
          quantity: 1,
          unit: 'PCS',
          rate: 0,
          amount: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = subtotal * 0.18; // Assuming 18% GST
    const totalValue = subtotal + gstAmount;

    return {
      subtotal,
      gstAmount,
      totalValue,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();

      const poData = {
        vendorId: formData.vendorId,
        poDate: formData.poDate,
        expectedDeliveryDate: formData.expectedDeliveryDate || null,
        deliveryAddress: formData.deliveryAddress,
        items: formData.items,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        totalValue: totals.totalValue,
        notes: formData.notes,
        termsConditions: formData.termsConditions,
        status: formData.status,
      };

      if (isEditing) {
        await api.put(`/api/purchase-orders/${id}`, poData);
        alert('Purchase Order updated successfully');
      } else {
        await api.post('/api/purchase-orders', poData);
        alert('Purchase Order created successfully');
      }

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving PO:', error);
      alert(error.response?.data?.error || 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Purchase Orders
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing
              ? 'Update purchase order details'
              : 'Create a new purchase order'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.vendorId}
                  onChange={(e) =>
                    setFormData({ ...formData, vendorId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.poDate}
                  onChange={(e) =>
                    setFormData({ ...formData, poDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedDeliveryDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address
                </label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryAddress: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Delivery address"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Item {index + 1}
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, 'description', e.target.value)
                        }
                        placeholder="Item description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HSN/SAC
                      </label>
                      <input
                        type="text"
                        value={item.hsnSacCode}
                        onChange={(e) =>
                          handleItemChange(index, 'hsnSacCode', e.target.value)
                        }
                        placeholder="HSN/SAC"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        required
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, 'unit', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PCS">Pcs</option>
                        <option value="KG">Kg</option>
                        <option value="LITER">Liter</option>
                        <option value="METER">Meter</option>
                        <option value="BOX">Box</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'rate',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded p-2">
                    <p className="text-sm text-gray-600">
                      Amount:{' '}
                      <span className="font-bold text-gray-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notes & Terms
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.termsConditions}
                  onChange={(e) =>
                    setFormData({ ...formData, termsConditions: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  ₹{totals.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%):</span>
                <span className="font-medium text-gray-900">
                  ₹{totals.gstAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
                <span className="text-blue-900">Total Value:</span>
                <span className="text-blue-600">
                  ₹{totals.totalValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => navigate('/purchase-orders')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading
                ? 'Saving...'
                : isEditing
                ? 'Update PO'
                : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}