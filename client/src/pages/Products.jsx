// ============================================
// FILE: client/src/pages/Products.jsx
// NEW FILE - Product/Service Master List
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products', {
        params: {
          isActive: !showInactive ? 'true' : undefined,
        },
      });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    navigate('/products/add');
  };

  const handleEditProduct = (product) => {
    navigate(`/products/edit/${product._id}`);
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!confirm(`Are you sure you want to deactivate "${productName}"?`)) return;

    try {
      await api.delete(`/api/products/${productId}`);
      setProducts(products.map((p) => (p._id === productId ? { ...p, isActive: false } : p)));
      alert('Product deactivated successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to deactivate product');
    }
  };

  const handleRestoreProduct = async (productId, productName) => {
    if (!confirm(`Restore "${productName}"?`)) return;

    try {
      await api.patch(`/api/products/${productId}/restore`);
      setProducts(products.map((p) => (p._id === productId ? { ...p, isActive: true } : p)));
      alert('Product restored successfully');
    } catch (error) {
      console.error('Error restoring product:', error);
      alert('Failed to restore product');
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.hsnSacCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || product.type === filterType;

    const matchesActive = showInactive ? true : product.isActive;

    return matchesSearch && matchesType && matchesActive;
  });

  const stats = {
    total: products.filter((p) => p.isActive).length,
    products: products.filter((p) => p.type === 'PRODUCT' && p.isActive).length,
    services: products.filter((p) => p.type === 'SERVICE' && p.isActive).length,
    inactive: products.filter((p) => !p.isActive).length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
            <p className="text-gray-600 text-sm mt-1">Manage your product and service catalog</p>
          </div>
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Product/Service
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.products}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Services</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.services}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, HSN/SAC, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="ALL">All Types</option>
                  <option value="PRODUCT">Products</option>
                  <option value="SERVICE">Services</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show Inactive</span>
              </label>
            </div>
          </div>
        </div>

        {/* Products List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterType !== 'ALL' ? 'No products found' : 'No products yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterType !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Create your first product or service to get started'}
              </p>
              {!searchTerm && filterType === 'ALL' && (
                <button
                  onClick={handleCreateProduct}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Product
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      HSN/SAC
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Unit
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Rate
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      GST%
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Category
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.type === 'PRODUCT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {product.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.hsnSacCode || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{product.unit}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        ₹{product.rate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {product.gstRate}%
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.category || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {product.isActive ? (
                            <>
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product._id, product.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Deactivate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestoreProduct(product._id, product.name)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}