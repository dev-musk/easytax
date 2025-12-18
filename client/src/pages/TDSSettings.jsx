// ============================================
// FILE: client/src/pages/TDSSettings.jsx
// NEW FILE - TDS Configuration Management
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Plus, Edit, Trash2, Save, X, Percent } from 'lucide-react';

export default function TDSSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    section: '',
    description: '',
    rate: 0,
    applicableFor: 'BOTH',
    isActive: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/api/tdsconfig');
      setConfigs(response.data || []);
    } catch (error) {
      console.error('Error fetching TDS configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setFormData({
      section: '',
      description: '',
      rate: 0,
      applicableFor: 'BOTH',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      section: config.section,
      description: config.description,
      rate: config.rate,
      applicableFor: config.applicableFor,
      isActive: config.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (configId, section) => {
    if (!confirm(`Delete TDS configuration for ${section}?`)) return;

    try {
      await api.delete(`/api/tdsconfig/${configId}`);
      setConfigs(configs.filter((c) => c._id !== configId));
      alert('TDS configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete TDS configuration');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingConfig) {
        const response = await api.put(`/api/tdsconfig/${editingConfig._id}`, formData);
        setConfigs(configs.map((c) => (c._id === editingConfig._id ? response.data : c)));
        alert('TDS configuration updated successfully');
      } else {
        const response = await api.post('/api/tdsconfig', formData);
        setConfigs([...configs, response.data]);
        alert('TDS configuration created successfully');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving config:', error);
      alert(error.response?.data?.error || 'Failed to save TDS configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultConfigs = async () => {
    if (!confirm('Load default Indian TDS sections? This will add common TDS rates.')) return;

    const defaults = [
      { section: '194C', description: 'Payment to contractors', rate: 1, applicableFor: 'BOTH' },
      { section: '194J', description: 'Professional or technical services', rate: 10, applicableFor: 'SERVICE' },
      { section: '194H', description: 'Commission or brokerage', rate: 5, applicableFor: 'SERVICE' },
      { section: '194I', description: 'Rent', rate: 10, applicableFor: 'SERVICE' },
      { section: '194Q', description: 'Payment for purchase of goods', rate: 0.1, applicableFor: 'PRODUCT' },
    ];

    try {
      for (const config of defaults) {
        try {
          await api.post('/api/tdsconfig', { ...config, isActive: true });
        } catch (err) {
          // Skip if already exists
          if (!err.response?.data?.error?.includes('already exists')) {
            throw err;
          }
        }
      }
      fetchConfigs();
      alert('Default TDS configurations loaded successfully');
    } catch (error) {
      console.error('Error loading defaults:', error);
      alert('Failed to load some default configurations');
    }
  };

  if (loading && configs.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TDS Settings</h1>
            <p className="text-gray-600 text-sm mt-1">
              Configure TDS (Tax Deducted at Source) rates for your organization
            </p>
          </div>
          <div className="flex gap-3">
            {configs.length === 0 && (
              <button
                onClick={loadDefaultConfigs}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                Load Defaults
              </button>
            )}
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add TDS Section
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Percent className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">About TDS Configuration</p>
              <p className="text-sm text-blue-700 mt-1">
                Set up TDS sections and rates that will be automatically applied to invoices. Common
                sections include 194C (Contractors), 194J (Professional Services), 194H (Commission), etc.
              </p>
            </div>
          </div>
        </div>

        {/* TDS Configurations List */}
        {configs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Percent className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No TDS configurations yet</h3>
              <p className="text-gray-500 mb-6">
                Add TDS sections to automatically calculate tax deductions on invoices
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={loadDefaultConfigs}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Load Default Sections
                </button>
                <button
                  onClick={handleAddNew}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Custom Section
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Section
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Description
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Rate (%)
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Applicable For
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
                  {configs.map((config) => (
                    <tr key={config._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{config.section}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{config.description}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold text-blue-600">{config.rate}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {config.applicableFor}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            config.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(config._id, config.section)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingConfig ? 'Edit TDS Section' : 'Add TDS Section'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., 194J"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Professional or technical services"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TDS Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable For
                </label>
                <select
                  value={formData.applicableFor}
                  onChange={(e) => setFormData({ ...formData, applicableFor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BOTH">Both Products & Services</option>
                  <option value="PRODUCT">Products Only</option>
                  <option value="SERVICE">Services Only</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}