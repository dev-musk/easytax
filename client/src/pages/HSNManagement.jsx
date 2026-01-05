// ============================================
// FILE: client/src/pages/HSNManagement.jsx
// HSN/SAC Code Management & Import Page
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { 
  Upload, 
  Database, 
  Search, 
  TrendingUp, 
  Package, 
  FileText,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';

export default function HSNManagement() {
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        searchHSN();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await api.get('/api/hsn/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const searchHSN = async () => {
    try {
      setSearching(true);
      const response = await api.get('/api/hsn/search', {
        params: { q: searchTerm, limit: 50 }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setImportResult(null);

    try {
      const response = await api.post('/api/hsn/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult({
        success: true,
        message: response.data.message,
        stats: response.data.stats,
      });

      // Refresh stats
      fetchStats();
      
      alert(`✅ ${response.data.message}\n\nTotal: ${response.data.stats.total}\nInserted: ${response.data.stats.inserted}\nUpdated: ${response.data.stats.updated}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      setImportResult({
        success: false,
        message: error.response?.data?.error || 'Failed to import HSN codes',
      });
      alert('❌ Error: ' + (error.response?.data?.error || 'Failed to import'));
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['HSN Code', 'Description', 'GST Rate'],
      ['8471', 'Automatic data processing machines', '18'],
      ['998314', 'IT design and development services', '18'],
      ['9983', 'Professional, technical and business services', '18'],
      ['2710', 'Petroleum oils and oils obtained from bituminous minerals', '5'],
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsn_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" />
            HSN/SAC Code Management
          </h1>
          <p className="text-gray-600 mt-1">
            Import and manage HSN/SAC codes from GST portal
          </p>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import HSN Codes from CSV
          </h2>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                📋 How to Import:
              </h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download HSN Master CSV from <a href="https://www.gst.gov.in" target="_blank" className="underline">GST Portal</a></li>
                <li>The CSV should have columns: <code className="bg-blue-100 px-1 rounded">HSN Code</code>, <code className="bg-blue-100 px-1 rounded">Description</code>, <code className="bg-blue-100 px-1 rounded">GST Rate</code></li>
                <li>Upload the CSV file below</li>
                <li>The system will automatically import all HSN/SAC codes</li>
              </ol>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="hsn-csv-upload"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              
              <label
                htmlFor="hsn-csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Importing HSN codes...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-700 font-medium mb-1">
                      Click to upload HSN Master CSV
                    </p>
                    <p className="text-sm text-gray-500">
                      CSV file up to 50MB
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Sample CSV Download */}
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4" />
              Download Sample CSV Format
            </button>

            {/* Import Result */}
            {importResult && (
              <div className={`rounded-lg p-4 ${
                importResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      importResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {importResult.message}
                    </p>
                    {importResult.success && importResult.stats && (
                      <div className="mt-2 text-sm text-green-700">
                        <p>Total Processed: {importResult.stats.total}</p>
                        <p>New Codes Added: {importResult.stats.inserted}</p>
                        <p>Existing Codes Updated: {importResult.stats.updated}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total HSN Codes</h3>
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            {loadingStats ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {stats?.overview?.totalCodes?.toLocaleString() || 0}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Goods (HSN)</h3>
              <Package className="w-5 h-5 text-green-500" />
            </div>
            {loadingStats ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {stats?.overview?.totalGoods?.toLocaleString() || 0}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Services (SAC)</h3>
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            {loadingStats ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {stats?.overview?.totalServices?.toLocaleString() || 0}
              </p>
            )}
          </div>
        </div>

        {/* Most Used HSN Codes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Most Used HSN Codes
          </h2>
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : stats?.mostUsed && stats.mostUsed.length > 0 ? (
            <div className="space-y-2">
              {stats.mostUsed.map((hsn, index) => (
                <div
                  key={hsn._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl font-bold text-gray-300">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-mono font-semibold text-blue-600">
                        {hsn.code}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {hsn.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {hsn.usageCount}
                    </p>
                    <p className="text-xs text-gray-500">uses</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No HSN codes used yet. Start creating invoices!
            </p>
          )}
        </div>

        {/* Search HSN Codes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Search HSN/SAC Codes
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by HSN code or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {searching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((hsn) => (
                <div
                  key={hsn._id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-blue-600">
                        {hsn.code}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {hsn.type}
                      </span>
                      {hsn.usageCount > 0 && (
                        <span className="text-xs text-green-600">
                          {hsn.usageCount} uses
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {hsn.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                      {hsn.defaultGstRate}% GST
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <p className="text-center text-gray-500 py-8">
              No results found for "{searchTerm}"
            </p>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}