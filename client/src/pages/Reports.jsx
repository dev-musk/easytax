// ============================================
// FILE: client/src/pages/Reports.jsx
// ============================================

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../utils/api";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  Users,
  RotateCw,
  FileCheck,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
import ExportButton from "../components/ExportButton";
import {
  exportReport,
  formatCurrency,
  formatDate,
} from "../utils/exportHelpers";

export default function Reports() {
  const [activeReport, setActiveReport] = useState("sales-by-customer");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const reports = [
    { id: "sales-by-customer", name: "Sales by Customer", icon: Users },
    { id: "sales-by-item", name: "Sales by Item", icon: Package },
    {
      id: "sales-return-history",
      name: "Sales Return History",
      icon: RotateCw,
    },
    {
      id: "sales-by-salesperson",
      name: "Sales by Salesperson",
      icon: TrendingUp,
    },
    { id: "sales-summary", name: "Sales Summary", icon: BarChart3 },
    { id: "recurring-invoices", name: "Recurring Invoices", icon: FileText },
    { id: "po-summary", name: "PO Summary", icon: FileCheck },
  ];

  // Handle report change - clear data immediately
  const handleReportChange = (reportId) => {
    if (reportId === activeReport) return; // Don't reload same report

    console.log(`Switching to: ${reportId}`);

    // Clear data IMMEDIATELY
    setReportData(null);
    setLoading(true);

    // Then change active report (triggers useEffect)
    setActiveReport(reportId);
  };

  useEffect(() => {
    // Fetch new data
    const fetchReport = async () => {
      try {
        console.log(`Fetching report: ${activeReport}`);
        const response = await api.get(`/api/reports/${activeReport}`, {
          params: dateRange,
        });
        console.log(`Received data for: ${activeReport}`, response.data);
        setReportData(response.data);
      } catch (error) {
        console.error("Error fetching report:", error);
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [activeReport, dateRange]);

  const handleExport = (format) => {
    if (!reportData) {
      alert("No data to export");
      return;
    }

    let data = [];
    let filename = "";
    let options = {};

    switch (activeReport) {
      case "sales-by-customer":
        if (!Array.isArray(reportData) || reportData.length === 0) return;
        data = reportData.map((r) => ({
          Customer: r.client,
          Email: r.clientEmail || "",
          GSTIN: r.clientGSTIN || "",
          Invoices: r.totalInvoices,
          Revenue: formatCurrency(r.totalRevenue),
          Paid: formatCurrency(r.totalPaid),
          Outstanding: formatCurrency(r.totalOutstanding),
          Discount: formatCurrency(r.totalDiscount),
          GST: formatCurrency(r.totalGST),
          "Avg Invoice": formatCurrency(r.avgInvoiceValue),
          "Collection %": r.collectionRate + "%",
        }));
        filename = "sales_by_customer";
        options = {
          title: "Sales by Customer Report",
          orientation: "landscape",
        };
        break;

      case "sales-by-item":
        if (!Array.isArray(reportData) || reportData.length === 0) return;
        data = reportData.map((r) => ({
          Item: r.description,
          HSN: r.hsnCode || "",
          Type: r.itemType,
          Quantity: r.totalQuantity,
          Revenue: formatCurrency(r.totalRevenue),
          Discount: formatCurrency(r.totalDiscount),
          "Avg Rate": formatCurrency(r.avgRate),
          "Times Ordered": r.timesOrdered,
          Invoices: r.invoiceCount,
        }));
        filename = "sales_by_item";
        options = {
          title: "Sales by Item Report",
          orientation: "landscape",
        };
        break;

      // Add other cases...

      default:
        alert("No data to export");
        return;
    }

    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    exportReport(data, format, filename, options);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Advanced Reports
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Comprehensive sales and business reports
            </p>
          </div>
          <ExportButton onExport={handleExport} disabled={!reportData} />
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => handleReportChange(report.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  activeReport === report.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <Icon
                  className={`w-6 h-6 mb-2 ${
                    activeReport === report.id
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    activeReport === report.id
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  {report.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Debug indicator - can be removed after testing */}
          <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center justify-between">
            <span>
              Report:{" "}
              <span className="font-mono font-bold">{activeReport}</span>
            </span>
            <span className="text-blue-500">
              {loading ? "⏳ Loading..." : reportData ? "✓ Loaded" : "○ Empty"}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Generating report...</p>
              <p className="text-gray-500 text-xs mt-2">{activeReport}</p>
            </div>
          ) : reportData ? (
            <ReportContent
              key={`${activeReport}-${Date.now()}`}
              activeReport={activeReport}
              reportData={reportData}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                No data loaded
              </p>
              <p className="text-gray-500 text-sm">
                Click a report to load data
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ReportContent({ activeReport, reportData }) {
  // Debug logging
  console.log(`=== REPORT: ${activeReport} ===`);
  console.log("Data:", reportData);
  console.log(
    "Data Type:",
    Array.isArray(reportData) ? "Array" : typeof reportData
  );
  if (reportData) {
    console.log("Data Keys:", Object.keys(reportData));
    if (Array.isArray(reportData)) {
      console.log("Array Length:", reportData.length);
    }
  }
  console.log("========================");

  const EmptyState = ({
    message = "No data available for the selected period",
  }) => (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 text-lg font-medium mb-2">{message}</p>
      <p className="text-gray-500 text-sm">
        Try adjusting your date range or add relevant data
      </p>
    </div>
  );

  if (activeReport === "sales-by-customer") {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return <EmptyState message="No customer sales data found" />;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3">Customer</th>
              <th className="text-center py-2 px-3">Invoices</th>
              <th className="text-right py-2 px-3">Revenue</th>
              <th className="text-right py-2 px-3">Paid</th>
              <th className="text-right py-2 px-3">Outstanding</th>
              <th className="text-center py-2 px-3">Collection %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-2 px-3">{row.client}</td>
                <td className="py-2 px-3 text-center">{row.totalInvoices}</td>
                <td className="py-2 px-3 text-right">
                  ₹{row.totalRevenue.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-right text-green-600">
                  ₹{row.totalPaid.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-right text-red-600">
                  ₹{row.totalOutstanding.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-center">{row.collectionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "sales-by-item") {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return <EmptyState message="No item sales data found" />;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3">Item</th>
              <th className="text-center py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Quantity</th>
              <th className="text-right py-2 px-3">Revenue</th>
              <th className="text-center py-2 px-3">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-2 px-3">{row.description}</td>
                <td className="py-2 px-3 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      row.itemType === "PRODUCT"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {row.itemType}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">{row.totalQuantity}</td>
                <td className="py-2 px-3 text-right font-medium">
                  ₹{row.totalRevenue.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-center">{row.timesOrdered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "sales-return-history") {
    if (
      !reportData ||
      !reportData.creditNotes ||
      reportData.creditNotes.length === 0
    ) {
      return (
        <EmptyState message="No credit notes found. Create credit notes to see this report." />
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">
              Total Credit Notes
            </p>
            <p className="text-2xl font-bold text-red-900 mt-1">
              {reportData.summary?.totalCreditNotes || 0}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">
              ₹{(reportData.summary?.totalAmount || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">
              Avg Credit Note
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              ₹
              {reportData.summary?.totalCreditNotes > 0
                ? Math.round(
                    reportData.summary.totalAmount /
                      reportData.summary.totalCreditNotes
                  ).toLocaleString("en-IN")
                : 0}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3">Credit Note #</th>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Customer</th>
                <th className="text-left py-2 px-3">Reason</th>
                <th className="text-right py-2 px-3">Amount</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.creditNotes.map((cn, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">
                    {cn.creditNoteNumber}
                  </td>
                  <td className="py-2 px-3">
                    {new Date(cn.creditNoteDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 px-3">
                    {cn.client?.companyName || "N/A"}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {cn.reason?.replace(/_/g, " ") || "N/A"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-red-600 font-medium">
                    ₹{cn.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        cn.status === "ISSUED"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {cn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeReport === "sales-by-salesperson") {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return (
        <EmptyState message="No salesperson data found. Add 'Sales Person Name' to invoices to see this report." />
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3">Salesperson</th>
              <th className="text-center py-2 px-3">Invoices</th>
              <th className="text-right py-2 px-3">Revenue</th>
              <th className="text-center py-2 px-3">Clients</th>
              <th className="text-center py-2 px-3">Collection %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">{row.salesperson}</td>
                <td className="py-2 px-3 text-center">{row.totalInvoices}</td>
                <td className="py-2 px-3 text-right font-medium">
                  ₹{row.totalRevenue.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-center">{row.uniqueClients}</td>
                <td className="py-2 px-3 text-center">{row.collectionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (activeReport === "sales-summary") {
    if (
      !reportData ||
      !reportData.summary ||
      reportData.summary.totalInvoices === 0
    ) {
      return (
        <EmptyState message="No sales data found for the selected period" />
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Invoices</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {reportData.summary.totalInvoices || 0}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              ₹{(reportData.summary.totalRevenue || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Total GST</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              ₹
              {(
                (reportData.summary.totalCGST || 0) +
                (reportData.summary.totalSGST || 0) +
                (reportData.summary.totalIGST || 0)
              ).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Outstanding</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">
              ₹
              {(reportData.summary.totalOutstanding || 0).toLocaleString(
                "en-IN"
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Status Breakdown</h3>
            {reportData.statusBreakdown &&
            reportData.statusBreakdown.length > 0 ? (
              <div className="space-y-2">
                {reportData.statusBreakdown.map((status, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-sm">{status._id}</span>
                    <span className="text-sm font-medium">
                      {status.count} (₹{status.amount.toLocaleString("en-IN")})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No status data</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Monthly Trend</h3>
            {reportData.monthlyTrend && reportData.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {reportData.monthlyTrend.map((month, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {month._id.month}/{month._id.year}
                    </span>
                    <span className="font-medium">
                      ₹{month.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No monthly data</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeReport === "recurring-invoices") {
    // Debug: Check data structure
    console.log("Recurring Invoices Data:", reportData);

    if (
      !reportData ||
      !reportData.recurringInvoices ||
      reportData.recurringInvoices.length === 0
    ) {
      return (
        <EmptyState message="No recurring invoices found. Create recurring invoices to see this report." />
      );
    }
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {reportData.summary?.total || 0}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Active</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {reportData.summary?.active || 0}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Inactive</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {reportData.summary?.inactive || 0}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">
              Monthly Revenue
            </p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              ₹
              {(reportData.summary?.totalMonthlyRevenue || 0).toLocaleString(
                "en-IN"
              )}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3">Template Name</th>
                <th className="text-left py-2 px-3">Client</th>
                <th className="text-center py-2 px-3">Frequency</th>
                <th className="text-right py-2 px-3">Amount</th>
                <th className="text-center py-2 px-3">Next Date</th>
                <th className="text-center py-2 px-3">Generated</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.recurringInvoices.map((ri, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">
                    {ri.templateName || "N/A"}
                  </td>
                  <td className="py-2 px-3">
                    {ri.client?.companyName || "N/A"}
                  </td>
                  <td className="py-2 px-3 text-center">{ri.frequency}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    ₹{(ri.totalAmount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {new Date(ri.nextInvoiceDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {ri.invoicesGenerated || 0}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        ri.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ri.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeReport === "po-summary") {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return (
        <EmptyState message="No PO data found. Add PO numbers to invoices to see this report." />
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 px-3">PO Number</th>
              <th className="text-left py-2 px-3">Customer</th>
              <th className="text-center py-2 px-3">Invoices</th>
              <th className="text-right py-2 px-3">Total Value</th>
              <th className="text-right py-2 px-3">Outstanding</th>
              <th className="text-center py-2 px-3">Fulfillment %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">{row.poNumber}</td>
                <td className="py-2 px-3">{row.client}</td>
                <td className="py-2 px-3 text-center">{row.totalInvoices}</td>
                <td className="py-2 px-3 text-right">
                  ₹{row.totalValue.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-right text-red-600">
                  ₹{row.totalOutstanding.toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-center">
                  {row.fulfillmentRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <EmptyState />;
}
