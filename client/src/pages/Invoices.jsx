// ============================================
// FILE: client/src/pages/Invoices.jsx
// Modern Invoice Management with Complete Features
// ============================================

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../utils/api";
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  Edit,
  Trash2,
  X,
  Calendar,
  DollarSign,
  FileText,
  ChevronDown,
  Minus,
  AlertCircle,
} from "lucide-react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get("/api/invoices");
      setInvoices(response.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get("/api/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleCreateInvoice = () => {
    setShowCreateModal(true);
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      await api.delete(`/api/invoices/${invoiceId}`);
      setInvoices(invoices.filter((inv) => inv._id !== invoiceId));
      alert("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.companyName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL" || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    PARTIALLY_PAID: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage and track all your invoices
            </p>
          </div>
          <button
            onClick={handleCreateInvoice}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterStatus !== "ALL"
                  ? "No invoices found"
                  : "No invoices yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== "ALL"
                  ? "Try adjusting your filters"
                  : "Create your first invoice to get started"}
              </p>
              {!searchTerm && filterStatus === "ALL" && (
                <button
                  onClick={handleCreateInvoice}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Invoice
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice._id}
                invoice={invoice}
                statusColors={statusColors}
                onView={handleViewInvoice}
                onDelete={handleDeleteInvoice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <ViewInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowViewModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </Layout>
  );
}

// ============================================
// Invoice Card Component
// ============================================

function InvoiceCard({ invoice, statusColors, onView, onDelete }) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Open PDF in new window for printing/saving
      const response = await api.get(`/api/invoices/${invoice._id}/pdf`, {
        responseType: "blob",
      });

      // Create blob URL
      const blob = new Blob([response.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);

      // Open in new window
      const printWindow = window.open(url, "_blank");

      // Trigger print dialog after content loads
      if (printWindow) {
        printWindow.onload = function () {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    const recipientEmail = prompt(
      "Enter recipient email address:",
      invoice.client?.email || ""
    );

    if (!recipientEmail) return;

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      await api.post(`/api/invoices/${invoice._id}/send-email`, {
        to: recipientEmail,
        subject: `Invoice ${invoice.invoiceNumber}`,
        message: "Please find attached invoice for your reference.",
      });

      alert(`Invoice sent successfully to ${recipientEmail}!`);
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.invoiceNumber || "DRAFT"}
            </h3>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                statusColors[invoice.status] || statusColors.DRAFT
              }`}
            >
              {invoice.status?.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {invoice.client?.companyName || "Unknown Client"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(invoice)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View invoice"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title={downloading ? "Generating PDF..." : "Download PDF"}
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title={sending ? "Sending..." : "Send email"}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Mail className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(invoice._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Due Date</p>
          <p className="text-sm font-medium text-gray-900">
            {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-sm font-bold text-gray-900">
            ₹{invoice.totalAmount?.toLocaleString("en-IN") || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className="text-sm font-bold text-red-600">
            ₹{invoice.balanceAmount?.toLocaleString("en-IN") || 0}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Create Invoice Modal
// ============================================

function CreateInvoiceModal({ clients, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    invoiceType: "TAX_INVOICE",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    items: [
      {
        description: "",
        hsnSacCode: "",
        quantity: 1,
        rate: 0,
        gstRate: 18,
        amount: 0,
      },
    ],
    discountType: "PERCENTAGE",
    discountValue: 0,
    notes: "",
  });

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "",
          hsnSacCode: "",
          quantity: 1,
          rate: 0,
          gstRate: 18,
          amount: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Calculate amount
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    let discountAmount = 0;

    if (formData.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * formData.discountValue) / 100;
    } else {
      discountAmount = formData.discountValue;
    }

    const taxableAmount = subtotal - discountAmount;
    const totalTax = formData.items.reduce(
      (sum, item) => sum + (item.amount * item.gstRate) / 100,
      0
    );
    const total = taxableAmount + totalTax;

    return { subtotal, discountAmount, taxableAmount, totalTax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...formData,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        totalTax: totals.totalTax,
        totalAmount: totals.total,
        balanceAmount: totals.total,
      };

      await api.post("/api/invoices", invoiceData);
      alert("Invoice created successfully");
      onSuccess();
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert(error.response?.data?.error || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-900">
            Create New Invoice
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Type
              </label>
              <select
                value={formData.invoiceType}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PROFORMA">Proforma Invoice</option>
                <option value="TAX_INVOICE">Tax Invoice</option>
                <option value="CREDIT_NOTE">Credit Note</option>
                <option value="DEBIT_NOTE">Debit Note</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                required
                value={formData.invoiceDate}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Line Items
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Item {index + 1}
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="HSN/SAC"
                        value={item.hsnSacCode}
                        onChange={(e) =>
                          handleItemChange(index, "hsnSacCode", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "rate",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        required
                        min="0"
                        max="28"
                        step="0.01"
                        placeholder="GST %"
                        value={item.gstRate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "gstRate",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm text-gray-600">Amount: </span>
                    <span className="text-sm font-bold text-gray-900">
                      ₹
                      {item.amount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({ ...formData, discountType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  ₹
                  {totals.subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    - ₹
                    {totals.discountAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="font-medium text-gray-900">
                  ₹
                  {totals.taxableAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium text-gray-900">
                  ₹
                  {totals.totalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200 flex justify-between">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="text-xl font-bold text-blue-600">
                  ₹
                  {totals.total.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              {loading ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// View Invoice Modal
// ============================================

function ViewInvoiceModal({ invoice, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/api/invoices/${invoice._id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);

      const printWindow = window.open(url, "_blank");

      if (printWindow) {
        printWindow.onload = function () {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = () => {
    setShowEmailModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {invoice.invoiceNumber}
              </h3>
              <p className="text-gray-600 mt-1">
                {invoice.invoiceType?.replace("_", " ")}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                invoice.status === "PAID"
                  ? "bg-green-100 text-green-700"
                  : invoice.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {invoice.status?.replace("_", " ")}
            </span>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Bill To:
              </h4>
              <p className="text-gray-900 font-medium">
                {invoice.client?.companyName}
              </p>
              <p className="text-gray-600 text-sm">
                {invoice.client?.billingAddress}
              </p>
              <p className="text-gray-600 text-sm">
                {invoice.client?.billingCity}, {invoice.client?.billingState}
              </p>
              {invoice.client?.gstin && (
                <p className="text-gray-600 text-sm mt-1">
                  GSTIN: {invoice.client?.gstin}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="space-y-1">
                <div>
                  <span className="text-sm text-gray-600">Invoice Date: </span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Due Date: </span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      ₹{item.rate?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      ₹{item.amount?.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  ₹{invoice.subtotal?.toLocaleString("en-IN")}
                </span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    - ₹{invoice.discountAmount?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium text-gray-900">
                  ₹{invoice.totalTax?.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{invoice.totalAmount?.toLocaleString("en-IN")}
                </span>
              </div>
              {invoice.balanceAmount > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">
                    Balance Due:
                  </span>
                  <span className="text-xl font-bold text-red-600">
                    ₹{invoice.balanceAmount?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Notes:
              </h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailInvoiceModal
          invoice={invoice}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            alert("Invoice sent successfully!");
          }}
        />
      )}
    </div>
  );
}

// ============================================
// NEW COMPONENT: Email Invoice Modal
// Add this new component at the end of your Invoices.jsx file
// ============================================

function EmailInvoiceModal({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: invoice.client?.email || "",
    cc: "",
    subject: `Invoice ${invoice.invoiceNumber} from Your Company`,
    message: `Dear ${
      invoice.client?.companyName
    },\n\nPlease find attached invoice ${
      invoice.invoiceNumber
    } for your reference.\n\nInvoice Details:\n- Amount: ₹${invoice.totalAmount?.toLocaleString(
      "en-IN"
    )}\n- Due Date: ${new Date(invoice.dueDate).toLocaleDateString(
      "en-IN"
    )}\n\nThank you for your business!\n\nBest regards,\nYour Company`,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/api/invoices/${invoice._id}/send-email`, formData);
      onSuccess();
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Send Invoice via Email
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CC (Optional)
            </label>
            <input
              type="email"
              value={formData.cc}
              onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="cc@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={8}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              {loading ? "Sending..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
