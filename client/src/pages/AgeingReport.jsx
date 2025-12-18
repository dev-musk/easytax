// ============================================
// FILE: client/src/pages/AgeingReport.jsx
// NEW FILE - Invoice Ageing Analysis Report
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Download,
  Search,
  Filter,
  Eye,
  ChevronDown,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function AgeingReport() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'detailed'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        api.get('/api/invoices'),
        api.get('/api/clients'),
      ]);

      // Filter only unpaid or partially paid invoices
      const unpaidInvoices = invoicesRes.data.filter(
        (inv) =>
          inv.status === 'PENDING' ||
          inv.status === 'PARTIALLY_PAID' ||
          inv.status === 'OVERDUE'
      );

      setInvoices(unpaidInvoices);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (dueDate) => {
    const days = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getAgeBucket = (daysOverdue) => {
    if (daysOverdue < 0) return 'NOT_DUE';
    if (daysOverdue <= 30) return '0-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
  };

  // Calculate ageing summary
  const ageingSummary = {
    notDue: { count: 0, amount: 0 },
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  };

  invoices.forEach((inv) => {
    const daysOverdue = getDaysOverdue(inv.dueDate);
    const bucket = getAgeBucket(daysOverdue);
    
    if (bucket === 'NOT_DUE') {
      ageingSummary.notDue.count++;
      ageingSummary.notDue.amount += inv.balanceAmount || 0;
    } else {
      ageingSummary[bucket].count++;
      ageingSummary[bucket].amount += inv.balanceAmount || 0;
    }
  });

  // Client-wise ageing
  const clientAgeingData = clients
    .map((client) => {
      const clientInvoices = invoices.filter((inv) => inv.client?._id === client._id);
      
      const ageing = {
        notDue: 0,
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };

      clientInvoices.forEach((inv) => {
        const daysOverdue = getDaysOverdue(inv.dueDate);
        const bucket = getAgeBucket(daysOverdue);
        ageing[bucket === 'NOT_DUE' ? 'notDue' : bucket] += inv.balanceAmount || 0;
      });

      const totalOutstanding = Object.values(ageing).reduce((sum, amt) => sum + amt, 0);

      return {
        client,
        ageing,
        totalOutstanding,
        invoiceCount: clientInvoices.length,
      };
    })
    .filter((item) => item.totalOutstanding > 0)
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  // Filter by search and client
  const filteredData = clientAgeingData.filter((item) => {
    const matchesSearch = item.client.companyName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesClient =
      selectedClient === 'ALL' || item.client._id === selectedClient;
    return matchesSearch && matchesClient;
  });

  const handleExportToExcel = () => {
    const exportData = filteredData.map((item) => ({
      'Client Name': item.client.companyName,
      'Total Outstanding': item.totalOutstanding,
      'Invoice Count': item.invoiceCount,
      'Not Due': item.ageing.notDue,
      '0-30 Days': item.ageing['0-30'],
      '31-60 Days': item.ageing['31-60'],
      '61-90 Days': item.ageing['61-90'],
      '90+ Days': item.ageing['90+'],
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) => headers.map((header) => row[header]).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ageing-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const totalOutstanding = Object.values(ageingSummary).reduce(
    (sum, bucket) => sum + bucket.amount,
    0
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Ageing Report</h1>
            <p className="text-gray-600 text-sm mt-1">
              Analyze outstanding invoices by payment delay periods
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Ageing Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Not Due</p>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ₹{ageingSummary.notDue.amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ageingSummary.notDue.count} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">0-30 Days</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              ₹{ageingSummary['0-30'].amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ageingSummary['0-30'].count} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">31-60 Days</p>
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              ₹{ageingSummary['31-60'].amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ageingSummary['31-60'].count} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">61-90 Days</p>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ₹{ageingSummary['61-90'].amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ageingSummary['61-90'].count} invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">90+ Days</p>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              ₹{ageingSummary['90+'].amount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ageingSummary['90+'].count} invoices
            </p>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Outstanding Amount</p>
              <p className="text-4xl font-bold">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </p>
              <p className="text-blue-100 text-sm mt-2">
                Across {invoices.length} outstanding invoices
              </p>
            </div>
            <Users className="w-16 h-16 text-blue-200 opacity-50" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="ALL">All Clients</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Summary View
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Detailed View
            </button>
          </div>
        </div>

        {/* Client-wise Ageing Table */}
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No outstanding invoices
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedClient !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'All invoices are paid on time!'}
              </p>
            </div>
          </div>
        ) : viewMode === 'summary' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Client
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Total Outstanding
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Invoices
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-blue-700 uppercase">
                      Not Due
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-green-700 uppercase">
                      0-30 Days
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-yellow-700 uppercase">
                      31-60 Days
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-orange-700 uppercase">
                      61-90 Days
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-red-700 uppercase">
                      90+ Days
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.client._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {item.client.companyName}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-sm font-bold text-gray-900">
                          ₹{item.totalOutstanding.toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {item.invoiceCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-blue-600">
                        {item.ageing.notDue > 0
                          ? `₹${item.ageing.notDue.toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-green-600">
                        {item.ageing['0-30'] > 0
                          ? `₹${item.ageing['0-30'].toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-yellow-600">
                        {item.ageing['31-60'] > 0
                          ? `₹${item.ageing['31-60'].toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-orange-600">
                        {item.ageing['61-90'] > 0
                          ? `₹${item.ageing['61-90'].toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-red-600 font-medium">
                        {item.ageing['90+'] > 0
                          ? `₹${item.ageing['90+'].toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ₹{totalOutstanding.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-900">
                      {invoices.length}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      ₹{ageingSummary.notDue.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      ₹{ageingSummary['0-30'].amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-yellow-600">
                      ₹{ageingSummary['31-60'].amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">
                      ₹{ageingSummary['61-90'].amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">
                      ₹{ageingSummary['90+'].amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <DetailedView
            invoices={invoices}
            filteredData={filteredData}
            getDaysOverdue={getDaysOverdue}
            getAgeBucket={getAgeBucket}
            navigate={navigate}
          />
        )}
      </div>
    </Layout>
  );
}

function DetailedView({ invoices, filteredData, getDaysOverdue, getAgeBucket, navigate }) {
  return (
    <div className="space-y-6">
      {filteredData.map((clientData) => {
        const clientInvoices = invoices.filter(
          (inv) => inv.client?._id === clientData.client._id
        );

        return (
          <div
            key={clientData.client._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {clientData.client.companyName}
                </h3>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Outstanding</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{clientData.totalOutstanding.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                      Invoice
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                      Due Date
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Days Overdue
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Age Bucket
                    </th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientInvoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice.dueDate);
                    const bucket = getAgeBucket(daysOverdue);
                    const isOverdue = daysOverdue > 0;

                    const bucketColors = {
                      'NOT_DUE': 'bg-blue-100 text-blue-700',
                      '0-30': 'bg-green-100 text-green-700',
                      '31-60': 'bg-yellow-100 text-yellow-700',
                      '61-90': 'bg-orange-100 text-orange-700',
                      '90+': 'bg-red-100 text-red-700',
                    };

                    return (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </p>
                        </td>
                        <td className="py-2 px-4">
                          <p
                            className={`text-sm ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`text-sm ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {isOverdue ? `${daysOverdue} days` : 'Not due'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              bucketColors[bucket]
                            }`}
                          >
                            {bucket === 'NOT_DUE' ? 'Not Due' : `${bucket} days`}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            onClick={() => navigate(`/invoices/view/${invoice._id}`)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}