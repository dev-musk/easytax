// ============================================
// FILE: client/src/pages/AddEditProduct.jsx
// ENHANCED - Add/Edit Product/Service Form with HSN Search
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import HSNSearch from '../components/HSNSearch';
import api from '../utils/api';
import { ArrowLeft, Save } from 'lucide-react';

export default function AddEditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PRODUCT',
    hsnSacCode: '',
    description: '',
    unit: 'PCS',
    rate: 0,
    gstRate: 18,
    category: '',
    isActive: true,
  });

  useEffect(() => {
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/api/products/${id}`);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to fetch product details');
      navigate('/products');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await api.put(`/api/products/${id}`, formData);
        alert('Product updated successfully');
      } else {
        await api.post('/api/products', formData);
        alert('Product created successfully');
      }
      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Products
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Product/Service' : 'Add New Product/Service'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update product/service details' : 'Add a new product or service to your catalog'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Website Design Service"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PRODUCT">Product</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., IT Services, Hardware"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the product/service..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* HSN/SAC Code - Enhanced Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">HSN/SAC Code</h2>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                HSN/SAC Code
              </label>
              
              {/* ✅ Enhanced HSN Search Component */}
              <HSNSearch
                value={formData.hsnSacCode}
                onChange={(code) => setFormData({ ...formData, hsnSacCode: code })}
                itemType={formData.type}
                onSelect={(hsn) => {
                  // Auto-fill HSN code
                  setFormData({
                    ...formData,
                    hsnSacCode: hsn.code,
                    // Auto-fill GST rate from HSN database
                    gstRate: hsn.defaultGstRate || formData.gstRate,
                  });

                  // Increment usage count for analytics
                  try {
                    api.post(`/api/hsn/${hsn.code}/increment-usage`);
                  } catch (error) {
                    console.log("Usage tracking failed (non-critical)");
                  }
                }}
                required={false}
                placeholder={
                  formData.type === 'SERVICE'
                    ? "Search or enter SAC code (e.g., 998314)"
                    : "Search or enter HSN code (e.g., 8471)"
                }
              />

              {/* Info Box */}
              <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    💡
                  </div>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">HSN/SAC Code Guide:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Products:</strong> Use HSN codes (e.g., 8471 for Computers)</li>
                      <li>• <strong>Services:</strong> Use SAC codes (e.g., 998314 for IT Services)</li>
                      <li>• Search by code or product name for quick selection</li>
                      <li>• GST rate will auto-fill from the database</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Tax Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Tax Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measurement <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PCS">Pieces</option>
                  <option value="KG">Kilogram</option>
                  <option value="LITER">Liter</option>
                  <option value="METER">Meter</option>
                  <option value="BOX">Box</option>
                  <option value="HOUR">Hour</option>
                  <option value="DAY">Day</option>
                  <option value="MONTH">Month</option>
                  <option value="SET">Set</option>
                  <option value="UNIT">Unit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Rate (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Base price per unit (excluding GST)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Rate (%) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="0">0% - Nil Rated</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
                {formData.hsnSacCode && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Auto-filled from HSN database
                  </p>
                )}
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-gray-600 text-xs mb-1">Base Rate</p>
                  <p className="font-bold text-lg text-gray-900">
                    ₹{formData.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">per {formData.unit}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-gray-600 text-xs mb-1">GST Amount</p>
                  <p className="font-bold text-lg text-orange-600">
                    ₹{((formData.rate * formData.gstRate) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">{formData.gstRate}% GST</p>
                </div>
                
                <div className="bg-blue-600 rounded-lg p-3 text-white">
                  <p className="text-blue-100 text-xs mb-1">Total Price</p>
                  <p className="font-bold text-xl">
                    ₹{(formData.rate + (formData.rate * formData.gstRate) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-100">incl. GST</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <p className="font-medium text-gray-900">Active Product/Service</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.isActive 
                    ? '✓ This product/service is available for use in invoices and will appear in the product catalog' 
                    : '✗ This product/service will not appear in invoice forms or product listings'}
                </p>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}