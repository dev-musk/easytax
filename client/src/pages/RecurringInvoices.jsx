// ============================================
// FILE: client/src/pages/RecurringInvoices.jsx
// NEW FILE - Recurring Invoice Management
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Zap,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function RecurringInvoices() {
  const navigate = useNavigate();
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchRecurring();
  }, []);

  const fetchRecurring = async () => {
    try {
      const response = await api.get('/api/recurring-invoices');
      setRecurring(response.data || []);
    } catch (error) {
      console.error('Error fetching recurring invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/api/recurring-invoices/${id}/toggle-status`);
      fetchRecurring();
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  const handleGenerateNow = async (id, templateName) => {
    if (!confirm(`Generate invoice now for "${templateName}"?`)) return;

    try {
      const response = await api.post(`/api/recurring-invoices/${id}/generate`);
      alert('Invoice generated successfully!');
      fetchRecurring();
      navigate(`/invoices/view/${response.data.invoice._id}`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  const handleDelete = async (id, templateName) => {
    if (!confirm(`Delete recurring template "${templateName}"?`)) return;

    try {
      await api.delete(`/api/recurring-invoices/${id}`);
      setRecurring(recurring.filter((r) => r._id !== id));
      alert('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      YEARLY: 'Yearly',
    };
    return labels[frequency] || frequency;
  };

  const getNextInvoiceDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const activeCount = recurring.filter((r) => r.isActive).length;
  const totalGenerated = recurring.reduce((sum, r) => sum + r.invoicesGenerated, 0);

  if (loading) {
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
            <h1 className="text-2xl font-bold text-gray-900">Recurring Invoices</h1>
            <p className="text-gray-600 text-sm mt-1">
              Automate invoice generation on schedule
            </p>
          </div>
          <button
            onClick={() => navigate('/recurring-invoices/add')}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Template
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Templates</p>
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{recurring.length}</p>
            <p className="text-xs text-gray-500 mt-1">{activeCount} active</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Templates</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {recurring.length - activeCount} paused
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Generated</p>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{totalGenerated}</p>
            <p className="text-xs text-gray-500 mt-1">invoices created</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">About Recurring Invoices</p>
              <p className="text-sm text-blue-700 mt-1">
                Create templates to automatically generate invoices on schedule. Perfect for
                retainers, subscriptions, and recurring services.
              </p>
            </div>
          </div>
        </div>

        {/* Templates List */}
        {recurring.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No recurring templates yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create templates to automatically generate invoices on schedule
              </p>
              <button
                onClick={() => navigate('/recurring-invoices/add')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recurring.map((template) => (
              <div
                key={template._id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                  template.isActive
                    ? 'border-green-200 hover:border-green-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.templateName}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          template.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {template.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {template.client?.companyName || 'Client not found'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateNow(template._id, template.templateName)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Generate invoice now"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(template._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        template.isActive
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={template.isActive ? 'Pause' : 'Resume'}
                    >
                      {template.isActive ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/recurring-invoices/edit/${template._id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template._id, template.templateName)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Frequency</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getFrequencyLabel(template.frequency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Next Invoice</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(template.nextInvoiceDate).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getNextInvoiceDate(template.nextInvoiceDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Generated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {template.invoicesGenerated} invoices
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Last Generated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {template.lastGeneratedDate
                          ? new Date(template.lastGeneratedDate).toLocaleDateString('en-IN')
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 mb-2">Items ({template.items.length})</p>
                  <div className="space-y-1">
                    {template.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.description}</span>
                        <span className="font-medium text-gray-900">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <p className="text-xs text-gray-500">+{template.items.length - 3} more items</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}