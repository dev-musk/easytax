// ============================================
// FILE: client/src/pages/Analytics.jsx
// NEW FILE - Advanced Analytics Dashboard
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [revenue, setRevenue] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [revenueRes, topClientsRes, productsRes] = await Promise.all([
        api.get('/api/analytics/revenue', { params: dateRange }),
        api.get('/api/analytics/top-clients', { params: { limit: 10 } }),
        api.get('/api/analytics/product-performance', { params: dateRange }),
      ]);

      setRevenue(revenueRes.data);
      setTopClients(topClientsRes.data || []);
      setProductPerformance(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType) => {
    try {
      const response = await api.get('/api/analytics/export', {
        params: { reportType, ...dateRange },
      });

      // Convert to CSV
      if (response.data && response.data.length > 0) {
        const headers = Object.keys(response.data[0]);
        const csvContent = [
          headers.join(','),
          ...response.data.map((row) => headers.map((h) => row[h]).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const summary = revenue?.summary || {};

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600 text-sm mt-1">
              Comprehensive business intelligence and insights
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/analytics/client-profitability')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Client Profitability
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAnalytics}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ₹{(summary.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalInvoices || 0} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Paid</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              ₹{(summary.totalPaid || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalRevenue > 0
                ? ((summary.totalPaid / summary.totalRevenue) * 100).toFixed(1)
                : 0}
              % collection rate
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Outstanding</p>
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">Pending collection</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Invoice</p>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              ₹{(summary.avgInvoiceValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per invoice</p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total GST Collected</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(summary.totalGST || 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total TDS Deducted</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(summary.totalTDS || 0).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Discounts</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{(summary.totalDiscount || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Status Breakdown */}
        {revenue?.statusBreakdown && revenue.statusBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {revenue.statusBreakdown.map((status) => (
                <div key={status._id} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">{status._id}</p>
                  <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ₹{status.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {revenue?.monthlyTrend && revenue.monthlyTrend.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
            <div className="space-y-3">
              {revenue.monthlyTrend.map((month) => {
                const monthName = new Date(month._id.year, month._id.month - 1).toLocaleString(
                  'en-IN',
                  { month: 'short', year: 'numeric' }
                );
                const maxRevenue = Math.max(...revenue.monthlyTrend.map((m) => m.revenue));
                const widthPercent = (month.revenue / maxRevenue) * 100;

                return (
                  <div key={`${month._id.year}-${month._id.month}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{monthName}</span>
                      <span className="text-sm text-gray-600">
                        ₹{month.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{month.invoices} invoices</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Clients */}
        {topClients.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Top 10 Clients</h2>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                      Rank
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                      Client
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                      Revenue
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Invoices
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topClients.map((item, idx) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm font-medium text-gray-900">#{idx + 1}</td>
                      <td className="py-2 px-4 text-sm text-gray-900">
                        {item.client?.companyName || 'N/A'}
                      </td>
                      <td className="py-2 px-4 text-sm text-right font-medium text-gray-900">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-4 text-sm text-center text-gray-600">
                        {item.totalInvoices}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Performance */}
        {productPerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Top Products/Services</h2>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                      Item
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                      Revenue
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Quantity
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Orders
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productPerformance.slice(0, 10).map((item) => (
                    <tr key={item._id.description} className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm text-gray-900">
                        {item._id.description}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item._id.itemType === 'PRODUCT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {item._id.itemType}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-sm text-right font-medium text-gray-900">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-4 text-sm text-center text-gray-600">
                        {item.totalQuantity}
                      </td>
                      <td className="py-2 px-4 text-sm text-center text-gray-600">
                        {item.timesOrdered}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleExport('invoices')}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Invoices</span>
            </button>
            <button
              onClick={() => handleExport('clients')}
              className="flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Clients</span>
            </button>
            <button
              onClick={() => handleExport('profitability')}
              className="flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Profitability</span>
            </button>
            <button
              onClick={() => handleExport('products')}
              className="flex items-center justify-center gap-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Products</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}