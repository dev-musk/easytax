// ============================================
// FILE: client/src/pages/GSTReports.jsx
// ✅ VERIFIED: GST Reports with Excel Export
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { FileText, Download, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GSTReports() {
  const [activeTab, setActiveTab] = useState('gstr1');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  
  const [period, setPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const fetchReport = async () => {
    if (!period.month || !period.year) {
      setError('Please select both month and year');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'gstr1':
          endpoint = '/api/gst-reports/gstr1';
          break;
        case 'gstr3b':
          endpoint = '/api/gst-reports/gstr3b';
          break;
        case 'hsn':
          endpoint = '/api/gst-reports/hsn-summary';
          break;
        default:
          endpoint = '/api/gst-reports/gstr1';
      }

      const response = await api.get(endpoint, {
        params: { month: period.month, year: period.year },
      });
      
      setReport(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.response?.data?.error || 'Failed to generate report. Please try again.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period.month && period.year) {
      fetchReport();
    }
  }, [activeTab, period]);

  // ============================================
  // EXCEL EXPORT FUNCTIONS
  // ============================================

  const exportGSTR1ToExcel = () => {
    if (!report) return;

    try {
      const wb = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ['GSTR-1 Report'],
        ['Period:', `${months.find(m => m.value === period.month)?.label} ${period.year}`],
        ['GSTIN:', report.gstin || 'N/A'],
        ['Legal Name:', report.legalName || 'N/A'],
        [],
        ['Summary'],
        ['Total Invoices', report.summary?.totalInvoices || 0],
        ['Total Taxable Value', report.summary?.totalTaxableValue || 0],
        ['Total CGST', report.summary?.totalCGST || 0],
        ['Total SGST', report.summary?.totalSGST || 0],
        ['Total IGST', report.summary?.totalIGST || 0],
        ['Total Tax', report.summary?.totalTax || 0],
        ['Total Invoice Value', report.summary?.totalInvoiceValue || 0],
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

      // 2. B2B Sheet
      if (report.b2b && report.b2b.length > 0) {
        const b2bData = [
          ['B2B Invoices'],
          [],
          ['Invoice Number', 'Invoice Date', 'Recipient GSTIN', 'Recipient Name', 'Invoice Value', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
          ...report.b2b.map(inv => [
            inv.invoiceNumber,
            new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
            inv.recipientGSTIN,
            inv.recipientName,
            inv.invoiceValue,
            inv.taxableValue,
            inv.cgst,
            inv.sgst,
            inv.igst,
          ]),
        ];
        const b2bWS = XLSX.utils.aoa_to_sheet(b2bData);
        XLSX.utils.book_append_sheet(wb, b2bWS, 'B2B');
      }

      // 3. B2CL Sheet
      if (report.b2cl && report.b2cl.length > 0) {
        const b2clData = [
          ['B2C Large Invoices (>2.5 Lakhs Interstate)'],
          [],
          ['Invoice Number', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'IGST'],
          ...report.b2cl.map(inv => [
            inv.invoiceNumber,
            new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
            inv.invoiceValue,
            inv.placeOfSupply,
            inv.igst,
          ]),
        ];
        const b2clWS = XLSX.utils.aoa_to_sheet(b2clData);
        XLSX.utils.book_append_sheet(wb, b2clWS, 'B2CL');
      }

      // 4. B2CS Sheet
      if (report.b2cs) {
        const b2csData = [
          ['B2C Small Summary'],
          [],
          ['Type', 'Place of Supply', 'Taxable Value', 'CGST', 'SGST'],
          [
            report.b2cs.type,
            report.b2cs.placeOfSupply,
            report.b2cs.taxableValue,
            report.b2cs.cgst,
            report.b2cs.sgst,
          ],
        ];
        const b2csWS = XLSX.utils.aoa_to_sheet(b2csData);
        XLSX.utils.book_append_sheet(wb, b2csWS, 'B2CS');
      }

      // 5. HSN Summary Sheet
      if (report.hsn && report.hsn.length > 0) {
        const hsnData = [
          ['HSN Summary'],
          [],
          ['HSN Code', 'Description', 'UQC', 'Quantity', 'Rate %', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
          ...report.hsn.map(item => [
            item.hsnCode,
            item.description,
            item.uqc,
            item.totalQuantity,
            item.rate,
            item.taxableValue,
            item.cgst,
            item.sgst,
            item.igst,
          ]),
        ];
        const hsnWS = XLSX.utils.aoa_to_sheet(hsnData);
        XLSX.utils.book_append_sheet(wb, hsnWS, 'HSN Summary');
      }

      const fileName = `GSTR1_${months.find(m => m.value === period.month)?.label}_${period.year}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('GSTR-1 exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export GSTR-1. Please try again.');
    }
  };

  const exportGSTR3BToExcel = () => {
    if (!report) return;

    try {
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['GSTR-3B Report'],
        ['Period:', `${months.find(m => m.value === period.month)?.label} ${period.year}`],
        ['GSTIN:', report.gstin || 'N/A'],
        ['Legal Name:', report.legalName || 'N/A'],
        [],
        ['3.1 Outward Taxable Supplies'],
        ['Taxable Value', report.outwardSupplies?.taxableValue || 0],
        ['CGST', report.outwardSupplies?.cgst || 0],
        ['SGST', report.outwardSupplies?.sgst || 0],
        ['IGST', report.outwardSupplies?.igst || 0],
        ['Cess', report.outwardSupplies?.cess || 0],
        [],
        ['3.2 Inter-State Supplies'],
        ['Taxable Value', report.interStateSupplies?.taxableValue || 0],
        ['IGST', report.interStateSupplies?.igst || 0],
        [],
        ['4. Eligible ITC (Input Tax Credit)'],
        ['Import of Goods - CGST', report.itc?.imports?.cgst || 0],
        ['Import of Goods - SGST', report.itc?.imports?.sgst || 0],
        ['Import of Goods - IGST', report.itc?.imports?.igst || 0],
        ['All Other ITC - CGST', report.itc?.all?.cgst || 0],
        ['All Other ITC - SGST', report.itc?.all?.sgst || 0],
        ['All Other ITC - IGST', report.itc?.all?.igst || 0],
        [],
        ['Net Tax Payable'],
        ['CGST', report.taxPayable?.cgst || 0],
        ['SGST', report.taxPayable?.sgst || 0],
        ['IGST', report.taxPayable?.igst || 0],
        ['Total Tax', report.taxPayable?.totalTax || 0],
      ];

      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws, 'GSTR-3B');

      const fileName = `GSTR3B_${months.find(m => m.value === period.month)?.label}_${period.year}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('GSTR-3B exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export GSTR-3B. Please try again.');
    }
  };

  const exportHSNToExcel = () => {
    if (!report || !report.summary) return;

    try {
      const wb = XLSX.utils.book_new();

      const hsnData = [
        ['HSN Summary Report'],
        ['Period:', `${months.find(m => m.value === period.month)?.label} ${period.year}`],
        [],
        ['Summary Totals'],
        ['Total Quantity', report.totals?.totalQuantity || 0],
        ['Total Taxable Value', report.totals?.taxableValue || 0],
        ['Total CGST', report.totals?.cgst || 0],
        ['Total SGST', report.totals?.sgst || 0],
        ['Total IGST', report.totals?.igst || 0],
        ['Total Tax', report.totals?.totalTax || 0],
        ['Total Value', report.totals?.totalValue || 0],
        [],
        ['HSN Code', 'Description', 'UQC', 'Quantity', 'Rate %', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'],
        ...report.summary.map(item => [
          item.hsnCode,
          item.description,
          item.uqc,
          item.totalQuantity,
          item.gstRate,
          item.taxableValue,
          item.cgst,
          item.sgst,
          item.igst,
          item.totalTax,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(hsnData);
      ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'HSN Summary');

      const fileName = `HSN_Summary_${months.find(m => m.value === period.month)?.label}_${period.year}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert('HSN Summary exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export HSN Summary. Please try again.');
    }
  };

  const handleExport = () => {
    if (!report) {
      alert('No data to export. Please generate a report first.');
      return;
    }

    try {
      switch (activeTab) {
        case 'gstr1':
          exportGSTR1ToExcel();
          break;
        case 'gstr3b':
          exportGSTR3BToExcel();
          break;
        case 'hsn':
          exportHSNToExcel();
          break;
        default:
          alert('Unknown report type');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Reports</h1>
          <p className="text-gray-600 text-sm mt-1">
            Generate GSTR-1, GSTR-3B, and HSN Summary reports with Excel export
          </p>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={period.month}
                  onChange={(e) => setPeriod({ ...period, month: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={period.year}
                  onChange={(e) => setPeriod({ ...period, year: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={!report || loading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 md:mt-6"
              title={!report ? 'Generate a report first' : 'Export to Excel'}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('gstr1')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'gstr1'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                GSTR-1 (Outward)
              </button>
              <button
                onClick={() => setActiveTab('gstr3b')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'gstr3b'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                GSTR-3B (Summary)
              </button>
              <button
                onClick={() => setActiveTab('hsn')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'hsn'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                HSN Summary
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Generating report...</p>
              </div>
            ) : !report ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {error ? 'Unable to load report' : 'No data available for selected period'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try selecting a different period or ensure invoices exist for this month
                </p>
              </div>
            ) : (
              <>
                {/* GSTR-1 Report */}
                {activeTab === 'gstr1' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Invoices</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {report.summary?.totalInvoices || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Taxable Value</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ₹{(report.summary?.totalTaxableValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">Total Tax</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          ₹{(report.summary?.totalTax || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Invoice Value</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          ₹{(report.summary?.totalInvoiceValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        B2B Invoices ({report.b2b?.length || 0})
                      </h3>
                      {report.b2b && report.b2b.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Invoice #</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Date</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">GSTIN</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Client</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Value</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">CGST</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">SGST</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">IGST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {report.b2b.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 font-medium">{inv.invoiceNumber}</td>
                                  <td className="py-2 px-3">
                                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 text-xs">{inv.recipientGSTIN}</td>
                                  <td className="py-2 px-3">{inv.recipientName}</td>
                                  <td className="py-2 px-3 text-right font-medium">
                                    ₹{inv.taxableValue.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.cgst.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.sgst.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.igst.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No B2B invoices for this period</p>
                      )}
                    </div>
                  </div>
                )}

                {/* GSTR-3B Report */}
                {activeTab === 'gstr3b' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Tax Liability Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">CGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹{(report.taxPayable?.cgst || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">SGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹{(report.taxPayable?.sgst || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">IGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹{(report.taxPayable?.igst || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-semibold">Total Tax</p>
                          <p className="text-xl font-bold text-blue-600 mt-1">
                            ₹{(report.taxPayable?.totalTax || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Outward Supplies
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Taxable Value</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹{(report.outwardSupplies?.taxableValue || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Tax</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹
                            {(
                              (report.outwardSupplies?.cgst || 0) +
                              (report.outwardSupplies?.sgst || 0) +
                              (report.outwardSupplies?.igst || 0)
                            ).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HSN Summary */}
                {activeTab === 'hsn' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Quantity</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {(report.totals?.totalQuantity || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Taxable Value</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ₹{(report.totals?.taxableValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">Total Tax</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          ₹{(report.totals?.totalTax || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">Total Value</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          ₹{(report.totals?.totalValue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {report.summary && report.summary.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">HSN Code</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Description</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">UQC</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Quantity</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Value</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">CGST</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">SGST</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">IGST</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {report.summary.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium">{item.hsnCode}</td>
                                <td className="py-2 px-3">{item.description}</td>
                                <td className="py-2 px-3 text-center">{item.uqc}</td>
                                <td className="py-2 px-3 text-right">{item.totalQuantity.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-medium">
                                  ₹{item.taxableValue.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.cgst.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.sgst.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.igst.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No HSN data for this period</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}