import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Users, 
  AlertCircle,
  Clock,
  Eye,
  X,
  ChevronDown,
  Activity
} from 'lucide-react';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchStatistics();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/audit-logs/search', {
        params: filters,
      });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/audit-logs/statistics', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/audit-logs/export', {
        params: filters,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-log-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audit logs');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[severity] || colors.LOW;
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-blue-100 text-blue-700',
      DELETE: 'bg-red-100 text-red-700',
      PAYMENT: 'bg-purple-100 text-purple-700',
      STATUS_CHANGE: 'bg-yellow-100 text-yellow-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Audit Trail
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Complete transaction history - Section 128 Compliance
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">
                {statistics.totalChanges?.[0]?.total?.toLocaleString() || 0}
              </p>
              <p className="text-sm opacity-90 mt-1">Total Changes</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">
                {statistics.byEntityType?.length || 0}
              </p>
              <p className="text-sm opacity-90 mt-1">Entity Types</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">
                {statistics.byUser?.length || 0}
              </p>
              <p className="text-sm opacity-90 mt-1">Active Users</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-3xl font-bold">
                {statistics.bySeverity?.find(s => s._id === 'HIGH')?.count || 0}
              </p>
              <p className="text-sm opacity-90 mt-1">High Priority</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="INVOICE">Invoice</option>
                <option value="PAYMENT">Payment</option>
                <option value="CLIENT">Client</option>
                <option value="PRODUCT">Product</option>
                <option value="PURCHASE_ORDER">Purchase Order</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="PAYMENT">Payment</option>
                <option value="STATUS_CHANGE">Status Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Entity
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Severity
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(log.timestamp).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.userIpAddress}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {log.entityType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.entityNumber}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {log.userName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.userEmail}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Audit Log Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Entity Type</p>
                  <p className="font-medium text-gray-900">{selectedLog.entityType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Entity Number</p>
                  <p className="font-medium text-gray-900">{selectedLog.entityNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Action</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Severity</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User</p>
                  <p className="font-medium text-gray-900">{selectedLog.userName}</p>
                  <p className="text-xs text-gray-500">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Timestamp</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedLog.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedLog.description}
                  </p>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Field Changes ({selectedLog.changes.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedLog.changes.map((change, idx) => (
                      <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          {change.field}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600">Old Value:</p>
                            <p className="text-gray-900 font-mono bg-white p-2 rounded mt-1">
                              {JSON.stringify(change.oldValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">New Value:</p>
                            <p className="text-gray-900 font-mono bg-white p-2 rounded mt-1">
                              {JSON.stringify(change.newValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}