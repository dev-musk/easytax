// ============================================
// FILE: client/src/pages/GSTReports.jsx
// ✅ VERIFIED: GST Reports with Excel Export
// ============================================

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../utils/api";
import { FileText, Download, Calendar, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import ExportButton from "../components/ExportButton";
import {
  exportReport,
  exportToExcelMultiSheet,
  formatCurrency,
  formatDate,
} from "../utils/exportHelpers";

export default function GSTReports() {
  const [activeTab, setActiveTab] = useState("gstr1");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const [period, setPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const fetchReport = async () => {
    if (!period.month || !period.year) {
      setError("Please select both month and year");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = "";
      switch (activeTab) {
        case "gstr1":
          endpoint = "/api/gst-reports/gstr1";
          break;
        case "gstr3b":
          endpoint = "/api/gst-reports/gstr3b";
          break;
        case "hsn":
          endpoint = "/api/gst-reports/hsn-summary";
          break;
        default:
          endpoint = "/api/gst-reports/gstr1";
      }

      const response = await api.get(endpoint, {
        params: { month: period.month, year: period.year },
      });

      setReport(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching report:", error);
      setError(
        error.response?.data?.error ||
          "Failed to generate report. Please try again."
      );
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

  const handleExport = (format) => {
    if (!report) {
      alert("No data to export. Please generate a report first.");
      return;
    }

    const months = [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      // ... add all months
    ];

    const monthLabel =
      months.find((m) => m.value === period.month)?.label || period.month;
    const filename = `${activeTab.toUpperCase()}_${monthLabel}_${period.year}`;

    switch (activeTab) {
      case "gstr1":
        exportGSTR1(format, filename);
        break;
      case "gstr3b":
        exportGSTR3B(format, filename);
        break;
      case "hsn":
        exportHSN(format, filename);
        break;
      default:
        alert("Unknown report type");
    }
  };

  const exportGSTR1 = (format, filename) => {
    if (format === "excel") {
      // Multi-sheet Excel for GSTR-1
      const sheets = [];

      // Summary sheet
      sheets.push({
        name: "Summary",
        data: [
          {
            "Total Invoices": report.summary?.totalInvoices || 0,
            "Total Taxable Value": report.summary?.totalTaxableValue || 0,
            "Total CGST": report.summary?.totalCGST || 0,
            "Total SGST": report.summary?.totalSGST || 0,
            "Total IGST": report.summary?.totalIGST || 0,
            "Total Tax": report.summary?.totalTax || 0,
            "Total Invoice Value": report.summary?.totalInvoiceValue || 0,
          },
        ],
      });

      // B2B sheet
      if (report.b2b && report.b2b.length > 0) {
        sheets.push({
          name: "B2B",
          data: report.b2b.map((inv) => ({
            "Invoice Number": inv.invoiceNumber,
            "Invoice Date": formatDate(inv.invoiceDate),
            "Recipient GSTIN": inv.recipientGSTIN,
            "Recipient Name": inv.recipientName,
            "Invoice Value": inv.invoiceValue,
            "Taxable Value": inv.taxableValue,
            CGST: inv.cgst,
            SGST: inv.sgst,
            IGST: inv.igst,
          })),
        });
      }

      // B2CL sheet
      if (report.b2cl && report.b2cl.length > 0) {
        sheets.push({
          name: "B2CL",
          data: report.b2cl.map((inv) => ({
            "Invoice Number": inv.invoiceNumber,
            "Invoice Date": formatDate(inv.invoiceDate),
            "Invoice Value": inv.invoiceValue,
            "Place of Supply": inv.placeOfSupply,
            IGST: inv.igst,
          })),
        });
      }

      // HSN sheet
      if (report.hsn && report.hsn.length > 0) {
        sheets.push({
          name: "HSN Summary",
          data: report.hsn.map((item) => ({
            "HSN Code": item.hsnCode,
            Description: item.description,
            UQC: item.uqc,
            Quantity: item.totalQuantity,
            "Rate %": item.rate,
            "Taxable Value": item.taxableValue,
            CGST: item.cgst,
            SGST: item.sgst,
            IGST: item.igst,
          })),
        });
      }

      exportToExcelMultiSheet(sheets, filename);
    } else {
      // For CSV/PDF, export B2B data
      const data =
        report.b2b?.map((inv) => ({
          Invoice: inv.invoiceNumber,
          Date: formatDate(inv.invoiceDate),
          GSTIN: inv.recipientGSTIN,
          Client: inv.recipientName,
          "Taxable Value": formatCurrency(inv.taxableValue),
          CGST: formatCurrency(inv.cgst),
          SGST: formatCurrency(inv.sgst),
          IGST: formatCurrency(inv.igst),
        })) || [];

      exportReport(data, format, filename, {
        title: `GSTR-1 Report - ${period.month}/${period.year}`,
        orientation: "landscape",
      });
    }
  };

  const exportGSTR3B = (format, filename) => {
    const data = [
      {
        GSTIN: report.gstin || "N/A",
        "Legal Name": report.legalName || "N/A",
        "Outward Taxable Value": report.outwardSupplies?.taxableValue || 0,
        "Outward CGST": report.outwardSupplies?.cgst || 0,
        "Outward SGST": report.outwardSupplies?.sgst || 0,
        "Outward IGST": report.outwardSupplies?.igst || 0,
        "Interstate Taxable Value":
          report.interStateSupplies?.taxableValue || 0,
        "Interstate IGST": report.interStateSupplies?.igst || 0,
        "Tax Payable CGST": report.taxPayable?.cgst || 0,
        "Tax Payable SGST": report.taxPayable?.sgst || 0,
        "Tax Payable IGST": report.taxPayable?.igst || 0,
        "Total Tax": report.taxPayable?.totalTax || 0,
      },
    ];

    exportReport(data, format, filename, {
      title: `GSTR-3B Report - ${period.month}/${period.year}`,
      orientation: "landscape",
    });
  };

  const exportHSN = (format, filename) => {
    const data =
      report.summary?.map((item) => ({
        "HSN Code": item.hsnCode,
        Description: item.description,
        UQC: item.uqc,
        Quantity: item.totalQuantity.toFixed(2),
        "Rate %": item.gstRate,
        "Taxable Value": formatCurrency(item.taxableValue),
        CGST: formatCurrency(item.cgst),
        SGST: formatCurrency(item.sgst),
        IGST: formatCurrency(item.igst),
        "Total Tax": formatCurrency(item.totalTax),
      })) || [];

    exportReport(data, format, filename, {
      title: `HSN Summary Report - ${period.month}/${period.year}`,
      orientation: "landscape",
    });
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
                  onChange={(e) =>
                    setPeriod({ ...period, month: parseInt(e.target.value) })
                  }
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
                  onChange={(e) =>
                    setPeriod({ ...period, year: parseInt(e.target.value) })
                  }
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
            <ExportButton
              onExport={handleExport}
              disabled={!report || loading}
            />
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
                onClick={() => setActiveTab("gstr1")}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === "gstr1"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                GSTR-1 (Outward)
              </button>
              <button
                onClick={() => setActiveTab("gstr3b")}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === "gstr3b"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                GSTR-3B (Summary)
              </button>
              <button
                onClick={() => setActiveTab("hsn")}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === "hsn"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
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
                  {error
                    ? "Unable to load report"
                    : "No data available for selected period"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try selecting a different period or ensure invoices exist for
                  this month
                </p>
              </div>
            ) : (
              <>
                {/* GSTR-1 Report */}
                {activeTab === "gstr1" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">
                          Total Invoices
                        </p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {report.summary?.totalInvoices || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">
                          Taxable Value
                        </p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ₹
                          {(
                            report.summary?.totalTaxableValue || 0
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">
                          Total Tax
                        </p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          ₹
                          {(report.summary?.totalTax || 0).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">
                          Invoice Value
                        </p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          ₹
                          {(
                            report.summary?.totalInvoiceValue || 0
                          ).toLocaleString("en-IN")}
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
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                  Invoice #
                                </th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                  Date
                                </th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                  GSTIN
                                </th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                  Client
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                  Value
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                  CGST
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                  SGST
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                  IGST
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {report.b2b.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 font-medium">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="py-2 px-3">
                                    {new Date(
                                      inv.invoiceDate
                                    ).toLocaleDateString("en-IN")}
                                  </td>
                                  <td className="py-2 px-3 text-xs">
                                    {inv.recipientGSTIN}
                                  </td>
                                  <td className="py-2 px-3">
                                    {inv.recipientName}
                                  </td>
                                  <td className="py-2 px-3 text-right font-medium">
                                    ₹{inv.taxableValue.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.cgst.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.sgst.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    ₹{inv.igst.toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No B2B invoices for this period
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* GSTR-3B Report */}
                {activeTab === "gstr3b" && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Tax Liability Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">CGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹
                            {(report.taxPayable?.cgst || 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">SGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹
                            {(report.taxPayable?.sgst || 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">IGST</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            ₹
                            {(report.taxPayable?.igst || 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-semibold">
                            Total Tax
                          </p>
                          <p className="text-xl font-bold text-blue-600 mt-1">
                            ₹
                            {(report.taxPayable?.totalTax || 0).toLocaleString(
                              "en-IN"
                            )}
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
                            ₹
                            {(
                              report.outwardSupplies?.taxableValue || 0
                            ).toLocaleString("en-IN")}
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
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HSN Summary */}
                {activeTab === "hsn" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">
                          Total Quantity
                        </p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {(report.totals?.totalQuantity || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">
                          Taxable Value
                        </p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          ₹
                          {(report.totals?.taxableValue || 0).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">
                          Total Tax
                        </p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          ₹
                          {(report.totals?.totalTax || 0).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600 font-medium">
                          Total Value
                        </p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          ₹
                          {(report.totals?.totalValue || 0).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                    </div>

                    {report.summary && report.summary.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                HSN Code
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Description
                              </th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">
                                UQC
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                Quantity
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                Value
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                CGST
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                SGST
                              </th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                                IGST
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {report.summary.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium">
                                  {item.hsnCode}
                                </td>
                                <td className="py-2 px-3">
                                  {item.description}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {item.uqc}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {item.totalQuantity.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right font-medium">
                                  ₹{item.taxableValue.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.cgst.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.sgst.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  ₹{item.igst.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No HSN data for this period
                      </p>
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
