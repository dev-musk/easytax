// ============================================
// FILE: client/src/pages/InvoiceView.jsx
// ENHANCED WITH FEATURES #32, #37, #41
// ============================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  X,
  Check,
  AlertCircle,
  QrCode,
  Mail,
  Copy,
  Trash2,
  StickyNote,
  FileCheck,
} from "lucide-react";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [invoice, setInvoice] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [upiQrCode, setUpiQrCode] = useState(null);
  const [showUpiQr, setShowUpiQr] = useState(false);

  // ✅ FEATURE #32: Quick Notes
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState("");

  // ✅ FEATURE #41: GST Filing Status
  const [showFilingModal, setShowFilingModal] = useState(false);
  const [filingFormData, setFilingFormData] = useState({
    gstr1Filed: false,
    gstr3bFiled: false,
    filingPeriod: "",
  });

  useEffect(() => {
    fetchInvoiceDetails();
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const response = await api.get("/api/organization");
      setOrganization(response.data);
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}`);
      setInvoice(response.data);

      // Set filing status in form
      if (response.data.gstFilingStatus) {
        setFilingFormData({
          gstr1Filed: response.data.gstFilingStatus.gstr1Filed || false,
          gstr3bFiled: response.data.gstFilingStatus.gstr3bFiled || false,
          filingPeriod: response.data.gstFilingStatus.filingPeriod || "",
        });
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setError(error.response?.data?.error || "Failed to load invoice");
      setTimeout(() => {
        if (
          window.confirm("Failed to load invoice. Return to invoices list?")
        ) {
          navigate("/invoices");
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FEATURE #32: Add Quick Note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert("Please enter a note");
      return;
    }

    try {
      await api.post(`/api/invoices/${id}/notes`, {
        note: newNote.trim(),
      });

      setNewNote("");
      setShowNoteInput(false);
      fetchInvoiceDetails(); // Refresh
      alert("Note added successfully");
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note");
    }
  };

  // ✅ FEATURE #41: Update GST Filing Status
  const handleUpdateFilingStatus = async () => {
    try {
      await api.patch(`/api/invoices/${id}/filing-status`, filingFormData);

      setShowFilingModal(false);
      fetchInvoiceDetails(); // Refresh
      alert("Filing status updated successfully");
    } catch (error) {
      console.error("Error updating filing status:", error);
      alert("Failed to update filing status");
    }
  };

  const generateUpiQr = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}/upi-qr`);

      const qrDataUrl = await QRCode.toDataURL(response.data.upiString, {
        width: 300,
        margin: 2,
        color: {
          dark: "#6B21A8",
          light: "#FFFFFF",
        },
      });

      setUpiQrCode(qrDataUrl);
      setShowUpiQr(true);
    } catch (error) {
      console.error("Error generating UPI QR:", error);
      alert(error.response?.data?.error || "Failed to generate UPI QR code");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}/pdf`, {
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
      alert("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this invoice? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/invoices/${id}`);
      alert("Invoice deleted successfully");
      navigate("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    }
  };

  const handleDuplicate = () => {
    navigate("/invoices/add", {
      state: {
        duplicateFrom: invoice,
        isDuplicate: true,
      },
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Load Invoice
            </h3>
            <p className="text-gray-600 mb-6">{error || "Invoice not found"}</p>
            <button
              onClick={() => navigate("/invoices")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ✅ FEATURE #37: ALL Action Buttons in Detail View */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex items-center gap-3">
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </button>
                <button
                  onClick={generateUpiQr}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  UPI QR
                </button>
              </>
            )}

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={handleDuplicate}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>

            {invoice.status !== "PAID" && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* ✅ FEATURE #41: GST Filing Status */}
        <div className="bg-white rounded-lg shadow-sm border p-4 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              GST Filing Status
            </h3>
            <button
              onClick={() => setShowFilingModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Update Status
            </button>
          </div>

          <div className="flex gap-4">
            <div
              className={`px-4 py-2 rounded-lg flex-1 ${
                invoice.gstFilingStatus?.gstr1Filed
                  ? "bg-green-100"
                  : "bg-yellow-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {invoice.gstFilingStatus?.gstr1Filed ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium">
                  GSTR-1:{" "}
                  {invoice.gstFilingStatus?.gstr1Filed ? "Filed" : "Pending"}
                </span>
              </div>
              {invoice.gstFilingStatus?.gstr1FiledDate && (
                <p className="text-xs text-gray-600">
                  Filed on:{" "}
                  {new Date(
                    invoice.gstFilingStatus.gstr1FiledDate
                  ).toLocaleDateString("en-IN")}
                </p>
              )}
            </div>

            <div
              className={`px-4 py-2 rounded-lg flex-1 ${
                invoice.gstFilingStatus?.gstr3bFiled
                  ? "bg-green-100"
                  : "bg-yellow-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {invoice.gstFilingStatus?.gstr3bFiled ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium">
                  GSTR-3B:{" "}
                  {invoice.gstFilingStatus?.gstr3bFiled ? "Filed" : "Pending"}
                </span>
              </div>
              {invoice.gstFilingStatus?.gstr3bFiledDate && (
                <p className="text-xs text-gray-600">
                  Filed on:{" "}
                  {new Date(
                    invoice.gstFilingStatus.gstr3bFiledDate
                  ).toLocaleDateString("en-IN")}
                </p>
              )}
            </div>

            {invoice.gstFilingStatus?.filingPeriod && (
              <div className="px-4 py-2 rounded-lg flex-1 bg-blue-50">
                <p className="text-xs text-blue-600 mb-1">Filing Period</p>
                <p className="text-sm font-medium text-blue-900">
                  {invoice.gstFilingStatus.filingPeriod}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ FEATURE #32: Quick Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-4 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-yellow-600" />
              Quick Notes
            </h3>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Note
            </button>
          </div>

          {showNoteInput && (
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your note here..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setNewNote("");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {invoice.quickNotes?.length > 0 ? (
              invoice.quickNotes.map((note, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded"
                >
                  <p className="text-sm text-gray-800">{note.note}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(note.addedAt).toLocaleString("en-IN")}
                    {note.addedBy?.name && ` • ${note.addedBy.name}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No notes yet</p>
            )}
          </div>
        </div>

        {/* Invoice Document (same as before) */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 print:shadow-none print:border-0">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-500">
            <div className="flex-1">
              {organization?.logo &&
                organization?.displaySettings?.showCompanyLogo !== false && (
                  <div className="mb-4">
                    <img
                      src={`${
                        import.meta.env.VITE_API_URL || "http://localhost:5000"
                      }/${organization.logo}`}
                      alt="Company Logo"
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                )}

              <h1 className="text-2xl font-bold text-blue-600 mb-2">
                {organization?.name || "Company Name"}
              </h1>
              {organization?.address && (
                <p className="text-sm text-gray-600">{organization.address}</p>
              )}
              {organization?.city && organization?.state && (
                <p className="text-sm text-gray-600">
                  {organization.city}, {organization.state} -{" "}
                  {organization.pincode}
                </p>
              )}
              {organization?.gstin && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">GSTIN:</span>{" "}
                  {organization.gstin}
                </p>
              )}
              {organization?.pan && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">PAN:</span> {organization.pan}
                </p>
              )}
              {organization?.cin && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">CIN:</span> {organization.cin}
                </p>
              )}
            </div>

            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {invoice.invoiceType === "PROFORMA"
                  ? "PROFORMA INVOICE"
                  : "TAX INVOICE"}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Invoice Number:{" "}
                <span className="font-semibold text-gray-900">
                  {invoice.invoiceNumber}
                </span>
              </p>
              <span
                className={`px-4 py-2 text-sm font-medium rounded-full ${
                  statusColors[invoice.status]
                }`}
              >
                {invoice.status?.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Bill To
              </h3>
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-base">
                  {invoice.client?.companyName}
                </p>
                {invoice.client?.billingAddress && (
                  <p className="text-sm text-gray-600">
                    {invoice.client.billingAddress}
                  </p>
                )}
                {invoice.client?.billingCity &&
                  invoice.client?.billingState && (
                    <p className="text-sm text-gray-600">
                      {invoice.client.billingCity},{" "}
                      {invoice.client.billingState}
                    </p>
                  )}
                {invoice.client?.gstin && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">GSTIN:</span>{" "}
                    {invoice.client.gstin}
                  </p>
                )}
              </div>
            </div>

            {invoice.client?.shippingAddress && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Ship To
                </h3>
                <div className="space-y-1">
                  <p className="font-bold text-gray-900 text-base">
                    {invoice.client?.companyName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {invoice.client.shippingAddress}
                  </p>
                  {invoice.client?.shippingCity &&
                    invoice.client?.shippingState && (
                      <p className="text-sm text-gray-600">
                        {invoice.client.shippingCity},{" "}
                        {invoice.client.shippingState}
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b border-gray-200 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">
                Invoice Date
              </p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Due Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">
                Payment Terms
              </p>
              <p className="font-semibold text-gray-900">
                {Math.ceil(
                  (new Date(invoice.dueDate) - new Date(invoice.invoiceDate)) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                Days
              </p>
            </div>
          </div>

          {/* ✅ FIXED: Additional Information Display */}
          {(invoice.poNumber ||
            invoice.poDate ||
            invoice.contractNumber ||
            invoice.salesPersonName) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200 print:block">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                Additional Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {invoice.poNumber && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">PO Number</p>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.poNumber}
                    </p>
                  </div>
                )}
                {invoice.poDate && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">PO Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(invoice.poDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
                {invoice.contractNumber && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Contract Number
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.contractNumber}
                    </p>
                  </div>
                )}
                {invoice.salesPersonName && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sales Person</p>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.salesPersonName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    #
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Description
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    HSN/SAC
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Qty
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Rate
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    GST%
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-2 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-gray-900">
                        {item.description}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.hsnSacCode || "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">
                      ₹{item.rate?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.gstRate}%
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                      ₹{item.amount?.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-96 space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{invoice.subtotal?.toLocaleString("en-IN")}
                </span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    Discount
                    {invoice.discountType === "PERCENTAGE"
                      ? ` (${invoice.discountValue}%)`
                      : ""}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    - ₹{invoice.discountAmount?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {invoice.cgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">CGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.cgst?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {invoice.sgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">SGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.sgst?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {invoice.igst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">IGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.igst?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {invoice.tcsAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    TCS ({invoice.tcsRate}%)
                  </span>
                  <span className="text-sm font-medium text-purple-600">
                    +₹{invoice.tcsAmount?.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Round Off</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.roundOff?.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-3 border-t-2 border-gray-300 bg-blue-600 text-white px-4 rounded-lg">
                <span className="text-base font-bold">Total Amount</span>
                <span className="text-base font-bold">
                  ₹{invoice.totalAmount?.toLocaleString("en-IN")}
                </span>
              </div>

              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Paid Amount</span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{invoice.paidAmount?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 px-4 rounded-lg">
                    <span className="text-sm font-bold text-red-900">
                      Balance Due
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      ₹{invoice.balanceAmount?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Amount in Words */}
          {organization?.displaySettings?.amountInWords !== false &&
            invoice.amountInWords && (
              <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Amount in Words
                </p>
                <p className="font-semibold text-gray-900">
                  {invoice.amountInWords}
                </p>
              </div>
            )}

          {/* Reverse Charge Notice */}
          {invoice.reverseCharge && (
            <div className="mb-8 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="text-sm font-semibold text-orange-900">
                ⚠️ REVERSE CHARGE APPLICABLE
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Tax is payable by the recipient under Section 9(3) of CGST Act
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8 pt-6 border-t border-gray-200 bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Terms & Conditions
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>1. Payment is due within the specified due date.</p>
              <p>2. Please include invoice number with payment.</p>
              <p>3. Late payments may incur additional charges.</p>
              <p>4. Goods once sold cannot be returned or exchanged.</p>
            </div>
          </div>

          {/* Bank Details */}
          {organization?.bankDetails &&
            organization?.displaySettings?.showBankDetails !== false && (
              <div className="mb-8 bg-green-50 border border-green-200 p-4 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-700 uppercase mb-3">
                  Bank Details for Payment
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {organization.bankDetails.bankName && (
                    <div>
                      <span className="text-gray-600">Bank Name:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {organization.bankDetails.bankName}
                      </span>
                    </div>
                  )}
                  {organization.bankDetails.accountHolderName && (
                    <div>
                      <span className="text-gray-600">Account Holder:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {organization.bankDetails.accountHolderName}
                      </span>
                    </div>
                  )}
                  {organization.bankDetails.accountNumber && (
                    <div>
                      <span className="text-gray-600">Account Number:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {organization.bankDetails.accountNumber}
                      </span>
                    </div>
                  )}
                  {organization.bankDetails.ifscCode && (
                    <div>
                      <span className="text-gray-600">IFSC Code:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {organization.bankDetails.ifscCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Authorized Signature */}
          {organization?.displaySettings?.showAuthorizedSignature !== false && (
            <div className="text-right">
              {organization?.authorizedSignatory?.signatureImage && (
                <div className="inline-block mb-2">
                  <img
                    src={`${
                      import.meta.env.VITE_API_URL || "http://localhost:5000"
                    }/${organization.authorizedSignatory.signatureImage}`}
                    alt="Authorized Signature"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <div className="inline-block border-t-2 border-gray-900 pt-2 px-8">
                <p className="text-xs text-gray-600">Authorized Signature</p>
                {organization?.authorizedSignatory?.name && (
                  <p className="text-sm font-semibold text-gray-900">
                    {organization.authorizedSignatory.name}
                  </p>
                )}
                {organization?.authorizedSignatory?.designation && (
                  <p className="text-xs text-gray-600">
                    {organization.authorizedSignatory.designation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              This is a computer generated invoice and does not require a
              physical signature.
            </p>
          </div>
        </div>
      </div>

      {/* UPI QR Modal */}
      {showUpiQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                UPI Payment QR Code
              </h3>
              <button
                onClick={() => setShowUpiQr(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {upiQrCode && (
              <div className="p-6 text-center">
                <img
                  src={upiQrCode}
                  alt="UPI QR Code"
                  className="mx-auto mb-4 border-4 border-purple-200 rounded-lg"
                />
                <p className="text-sm text-gray-600 mb-2">
                  Scan with any UPI app to pay
                </p>
                <p className="text-2xl font-bold text-purple-600 mb-4">
                  ₹
                  {invoice.balanceAmount?.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>

                <div className="flex gap-2">
                  <a
                    href={upiQrCode}
                    download={`UPI_QR_${invoice.invoiceNumber}.png`}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download QR
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchInvoiceDetails();
          }}
        />
      )}

      {/* ✅ FEATURE #41: GST Filing Status Modal */}
      {showFilingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Update GST Filing Status
              </h3>
              <button
                onClick={() => setShowFilingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filing Period (e.g., Jan 2026)
                </label>
                <input
                  type="text"
                  value={filingFormData.filingPeriod}
                  onChange={(e) =>
                    setFilingFormData({
                      ...filingFormData,
                      filingPeriod: e.target.value,
                    })
                  }
                  placeholder="Jan 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <input
                  type="checkbox"
                  id="gstr1Filed"
                  checked={filingFormData.gstr1Filed}
                  onChange={(e) =>
                    setFilingFormData({
                      ...filingFormData,
                      gstr1Filed: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-green-600"
                />
                <label
                  htmlFor="gstr1Filed"
                  className="text-sm font-medium text-green-900"
                >
                  GSTR-1 Filed
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="gstr3bFiled"
                  checked={filingFormData.gstr3bFiled}
                  onChange={(e) =>
                    setFilingFormData({
                      ...filingFormData,
                      gstr3bFiled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600"
                />
                <label
                  htmlFor="gstr3bFiled"
                  className="text-sm font-medium text-blue-900"
                >
                  GSTR-3B Filed
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowFilingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateFilingStatus}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Payment Modal Component (same as before)
function PaymentModal({ invoice, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: invoice.balanceAmount || 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "CASH",
    referenceNumber: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (formData.amount > invoice.balanceAmount) {
      setError("Payment amount cannot exceed balance amount");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/payments", {
        invoiceId: invoice._id,
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
      });

      alert("Payment recorded successfully!");
      onSuccess();
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.error || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-semibold text-gray-900">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-gray-900">
                ₹{invoice.totalAmount?.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-semibold text-green-600">
                ₹{invoice.paidAmount?.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="text-gray-600">Balance Due:</span>
              <span className="font-bold text-red-600">
                ₹{invoice.balanceAmount?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData({ ...formData, paymentDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) =>
                setFormData({ ...formData, paymentMode: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) =>
                setFormData({ ...formData, referenceNumber: e.target.value })
              }
              placeholder="Transaction ID, Cheque No, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
