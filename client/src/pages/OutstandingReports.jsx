// ============================================
// FILE: client/src/pages/OutstandingReports.jsx
// ADAPTED - Uses authStore (no changes needed as it doesn't use auth)
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
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export default function OutstandingReports() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [sortBy, setSortBy] = useState('dueDate');

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

  // Calculate summary statistics
  const summary = {
    totalOutstanding: invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0),
    totalInvoices: invoices.length,
    overdueAmount: invoices
      .filter((inv) => new Date(inv.dueDate) < new Date())
      .reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0),
    overdueCount: invoices.filter((inv) => new Date(inv.dueDate) < new Date()).length,
  };

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient =
        selectedClient === 'ALL' || invoice.client?._id === selectedClient;

      return matchesSearch && matchesClient;
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'amount') {
        return b.balanceAmount - a.balanceAmount;
      } else if (sortBy === 'client') {
        return (a.client?.companyName || '').localeCompare(b.client?.companyName || '');
      }
      return 0;
    });

  // Client-wise summary
  const clientWiseSummary = clients
    .map((client) => {
      const clientInvoices = filteredInvoices.filter(
        (inv) => inv.client?._id === client._id
      );
      const outstanding = clientInvoices.reduce(
        (sum, inv) => sum + (inv.balanceAmount || 0),
        0
      );
      return {
        client,
        count: clientInvoices.length,
        outstanding,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = filteredInvoices.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      'Client Name': inv.client?.companyName || '',
      'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      'Due Date': new Date(inv.dueDate).toLocaleDateString('en-IN'),
      'Total Amount': inv.totalAmount,
      'Paid Amount': inv.paidAmount,
      'Balance Amount': inv.balanceAmount,
      Status: inv.status,
      'Days Overdue': Math.max(
        0,
        Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
      ),
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) => headers.map((header) => row[header]).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outstanding-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getDaysOverdue = (dueDate) => {
    const days = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outstanding Reports</h1>
            <p className="text-gray-600 text-sm mt-1">
              Track pending and overdue invoice payments
            </p>
          </div>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export to Excel
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{summary.totalOutstanding.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalInvoices} pending invoices
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Overdue Amount</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              ₹{summary.overdueAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-1">{summary.overdueCount} overdue invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Days Overdue</p>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.overdueCount > 0
                ? Math.round(
                    invoices
                      .filter((inv) => new Date(inv.dueDate) < new Date())
                      .reduce((sum, inv) => sum + getDaysOverdue(inv.dueDate), 0) /
                      summary.overdueCount
                  )
                : 0}{' '}
              days
            </p>
            <p className="text-xs text-gray-500 mt-1">For overdue invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Collection Rate</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {invoices.length > 0
                ? Math.round(
                    (invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) /
                      invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)) *
                      100
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-gray-500 mt-1">Payment collection rate</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices or clients..."
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

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="client">Sort by Client</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Client-wise Summary */}
        {clientWiseSummary.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Client-wise Outstanding Summary
            </h2>
            <div className="space-y-3">
              {clientWiseSummary.slice(0, 5).map(({ client, count, outstanding }) => (
                <div
                  key={client._id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{client.companyName}</p>
                    <p className="text-xs text-gray-500">{count} pending invoices</p>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    ₹{outstanding.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No outstanding invoices
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedClient !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'All invoices are paid!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Invoice
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Client
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Due Date
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Total
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Paid
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Outstanding
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Days Overdue
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice.dueDate);
                    const isOverdue = daysOverdue > 0;

                    return (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">
                            {invoice.client?.companyName || 'Unknown'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p
                            className={`text-sm font-medium ${
                              isOverdue ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="text-sm text-green-600">
                            ₹{invoice.paidAmount?.toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <p className="text-sm font-bold text-red-600">
                            ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOverdue ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {daysOverdue} days
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => navigate(`/invoices/view/${invoice._id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
        )}
      </div>
    </Layout>
  );
}