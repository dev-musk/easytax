// ============================================
// FILE: client/src/pages/InventoryDashboard.jsx
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('all');

  useEffect(() => {
    fetchDashboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/invoices/inventory/dashboard');
      setDashboard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
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

  if (!dashboard) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No inventory data available</p>
        </div>
      </Layout>
    );
  }

  const locationStockData = Object.entries(dashboard.locationStock || {});

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inventory Intelligence Dashboard
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Real-time stock tracking with alerts and multi-location management
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-4 h-4" />
            Live updates every 30s
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboard.totalProducts}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Stock Value</p>
                <p className="text-2xl font-bold text-green-900">
                  ₹{dashboard.totalStockValue?.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1 font-medium">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-900">
                  {dashboard.lowStockItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 mb-1 font-medium">
                  Overstock Items
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {dashboard.overstockItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {dashboard.lowStockItems > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Low Stock Alert
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  {dashboard.lowStockItems} item(s) are below reorder level. Immediate
                  action required.
                </p>

                <div className="space-y-2">
                  {dashboard.lowStockDetails?.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Current: {item.currentStock} {item.unit} | Reorder Level:{' '}
                          {item.reorderLevel} {item.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/items/edit/${item._id}`)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        Reorder Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overstock Alert */}
        {dashboard.overstockItems > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  Overstock Alert
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  {dashboard.overstockItems} item(s) exceed maximum stock levels. Consider
                  promotional sales.
                </p>

                <div className="space-y-2">
                  {dashboard.overstockDetails?.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Current: {item.currentStock} {item.unit} | Max Level:{' '}
                          {item.maxStockLevel} {item.unit}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        {Math.round(
                          ((item.currentStock - item.maxStockLevel) / item.maxStockLevel) *
                            100
                        )}
                        % over
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expiring Batches */}
        {dashboard.expiringBatches > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Expiring Soon
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  {dashboard.expiringBatches} batch(es) expiring within 30 days
                </p>

                <div className="space-y-2">
                  {dashboard.expiringBatchesDetails?.map((batch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{batch.productName}</p>
                        <p className="text-sm text-gray-600">
                          Batch: {batch.batchNumber} | Qty: {batch.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-yellow-600">
                          Expires:{' '}
                          {new Date(batch.expiryDate).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.ceil(
                            (new Date(batch.expiryDate) - new Date()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Location Stock */}
        {locationStockData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                Stock by Location
              </h3>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {locationStockData.map(([location]) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locationStockData
                .filter(
                  ([location]) => selectedLocation === 'all' || location === selectedLocation
                )
                .map(([location, data]) => (
                  <div
                    key={location}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Warehouse className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{location}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items:</span>
                        <span className="font-medium text-gray-900">{data.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-medium text-gray-900">
                          {data.totalQuantity}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="text-gray-600">Stock Value:</span>
                        <span className="font-bold text-blue-600">
                          ₹{data.totalValue?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/items/add')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Add New Product</p>
            </button>

            <button
              onClick={() => navigate('/items')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">View All Items</p>
            </button>

            <button
              onClick={fetchDashboard}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Refresh Data</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}