// ============================================
// FILE: client/src/pages/ClientProfitability.jsx
// NEW FILE - Client-wise Profitability Analysis
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';

export default function ClientProfitability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profitability, setProfitability] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('totalRevenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchProfitability();
  }, [dateRange]);

  const fetchProfitability = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/analytics/client-profitability', {
        params: dateRange,
      });
      setProfitability(response.data || []);
    } catch (error) {
      console.error('Error fetching profitability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredAndSortedData.map((item) => ({
      'Client': item.client?.companyName || 'N/A',
      'Total Invoices': item.totalInvoices,
      'Total Revenue': item.totalRevenue,
      'Total Paid': item.totalPaid,
      'Outstanding': item.totalOutstanding,
      'Avg Invoice Value': item.avgInvoiceValue,
      'Total Discount': item.totalDiscount,
      'Total TDS': item.totalTDS,
      'Collection Rate (%)': item.collectionRate.toFixed(2),
      'Profit Margin': item.profitMargin,
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) => headers.map((h) => row[h]).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-profitability-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort data
  const filteredAndSortedData = profitability
    .filter((item) =>
      item.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // Calculate totals
  const totals = filteredAndSortedData.reduce(
    (acc, item) => ({
      totalInvoices: acc.totalInvoices + item.totalInvoices,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalPaid: acc.totalPaid + item.totalPaid,
      totalOutstanding: acc.totalOutstanding + item.totalOutstanding,
      totalDiscount: acc.totalDiscount + item.totalDiscount,
      totalTDS: acc.totalTDS + item.totalTDS,
      profitMargin: acc.profitMargin + item.profitMargin,
    }),
    {
      totalInvoices: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalDiscount: 0,
      totalTDS: 0,
      profitMargin: 0,
    }
  );

  const avgCollectionRate = totals.totalRevenue > 0
    ? (totals.totalPaid / totals.totalRevenue) * 100
    : 0;

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
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Analytics
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Client-wise Profitability</h1>
            <p className="text-gray-600 text-sm mt-1">
              Detailed profitability analysis by client
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export to Excel
          </button>
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
                onClick={fetchProfitability}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Clients</p>
            <p className="text-3xl font-bold text-gray-900">{filteredAndSortedData.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">
              ₹{totals.totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Total Outstanding</p>
            <p className="text-3xl font-bold text-orange-600">
              ₹{totals.totalOutstanding.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Avg Collection Rate</p>
            <p className="text-3xl font-bold text-blue-600">
              {avgCollectionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Profitability Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('client.companyName')}
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Client
                  </th>
                  <th
                    onClick={() => handleSort('totalInvoices')}
                    className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Invoices
                  </th>
                  <th
                    onClick={() => handleSort('totalRevenue')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Total Revenue
                  </th>
                  <th
                    onClick={() => handleSort('totalPaid')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Paid
                  </th>
                  <th
                    onClick={() => handleSort('totalOutstanding')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Outstanding
                  </th>
                  <th
                    onClick={() => handleSort('collectionRate')}
                    className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Collection %
                  </th>
                  <th
                    onClick={() => handleSort('avgInvoiceValue')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Avg Invoice
                  </th>
                  <th
                    onClick={() => handleSort('totalDiscount')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Discounts
                  </th>
                  <th
                    onClick={() => handleSort('totalTDS')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    TDS
                  </th>
                  <th
                    onClick={() => handleSort('profitMargin')}
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  >
                    Profit Margin
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedData.map((item) => {
                  const collectionRateColor =
                    item.collectionRate >= 80
                      ? 'text-green-600 bg-green-50'
                      : item.collectionRate >= 50
                      ? 'text-yellow-600 bg-yellow-50'
                      : 'text-red-600 bg-red-50';

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">
                          {item.client?.companyName || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {item.totalInvoices}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        ₹{item.totalPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-orange-600">
                        ₹{item.totalOutstanding.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${collectionRateColor}`}
                        >
                          {item.collectionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        ₹{item.avgInvoiceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        ₹{item.totalDiscount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        ₹{item.totalTDS.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        ₹{item.profitMargin.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                  <td className="py-3 px-4 text-center font-bold text-gray-900">
                    {totals.totalInvoices}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₹{totals.totalRevenue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₹{totals.totalPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-orange-600">
                    ₹{totals.totalOutstanding.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600">
                    {avgCollectionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">-</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₹{totals.totalDiscount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₹{totals.totalTDS.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₹{totals.profitMargin.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <p className="text-gray-500">No data available for selected date range</p>
          </div>
        )}
      </div>
    </Layout>
  );
}