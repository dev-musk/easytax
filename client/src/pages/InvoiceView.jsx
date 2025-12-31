// ============================================
// FILE: client/src/pages/InvoiceView.jsx
// FIXED - Uses correct payments endpoint
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  X,
  Check,
  AlertCircle,
  QrCode, // ✅ PHASE 4: QR Code icon
} from 'lucide-react';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [invoice, setInvoice] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [upiQrCode, setUpiQrCode] = useState(null);
  const [showUpiQr, setShowUpiQr] = useState(false);

  useEffect(() => {
    fetchInvoiceDetails();
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const response = await api.get('/api/organization');
      setOrganization(response.data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      console.log('Fetching invoice:', id);
      const response = await api.get(`/api/invoices/${id}`);
      console.log('Invoice data:', response.data);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      console.error('Error details:', error.response);
      setError(error.response?.data?.error || 'Failed to load invoice');
      setTimeout(() => {
        if (window.confirm('Failed to load invoice. Return to invoices list?')) {
          navigate('/invoices');
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PHASE 4: Generate UPI QR Code
  const generateUpiQr = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}/upi-qr`);
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(response.data.upiString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#6B21A8', // Purple
          light: '#FFFFFF',
        },
      });
      
      setUpiQrCode(qrDataUrl);
      setShowUpiQr(true);
    } catch (error) {
      console.error('Error generating UPI QR:', error);
      alert(error.response?.data?.error || 'Failed to generate UPI QR code. Please add UPI ID in Settings → Bank Details.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = function () {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Invoice</h3>
            <p className="text-gray-600 mb-6">{error || 'Invoice not found'}</p>
            <button
              onClick={() => navigate('/invoices')}
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
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex items-center gap-3">
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Record Payment
              </button>
            )}
            {/* ✅ PHASE 4: UPI QR Button */}
            {invoice.status !== 'PAID' && (
              <button
                onClick={generateUpiQr}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                UPI QR Code
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 print:shadow-none print:border-0">
          {/* Invoice Header with Logo */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-500">
            <div className="flex-1">
              {/* Company Logo */}
              {organization?.logo && organization?.displaySettings?.showCompanyLogo !== false && (
                <div className="mb-4">
                  <img
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${organization.logo}`}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              
              {/* Company Details */}
              <h1 className="text-2xl font-bold text-blue-600 mb-2">
                {organization?.name || 'Company Name'}
              </h1>
              {organization?.address && (
                <p className="text-sm text-gray-600">{organization.address}</p>
              )}
              {organization?.city && organization?.state && (
                <p className="text-sm text-gray-600">
                  {organization.city}, {organization.state} - {organization.pincode}
                </p>
              )}
              {organization?.gstin && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">GSTIN:</span> {organization.gstin}
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
              {organization?.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Email:</span> {organization.email}
                </p>
              )}
              {organization?.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Phone:</span> {organization.phone}
                </p>
              )}
            </div>

            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {invoice.invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Invoice Number: <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
              </p>
              <span
                className={`px-4 py-2 text-sm font-medium rounded-full ${
                  statusColors[invoice.status]
                }`}
              >
                {invoice.status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-base">{invoice.client?.companyName}</p>
                {invoice.client?.billingAddress && (
                  <p className="text-sm text-gray-600">{invoice.client.billingAddress}</p>
                )}
                {invoice.client?.billingCity && invoice.client?.billingState && (
                  <p className="text-sm text-gray-600">
                    {invoice.client.billingCity}, {invoice.client.billingState}
                  </p>
                )}
                {invoice.client?.gstin && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">GSTIN:</span> {invoice.client.gstin}
                  </p>
                )}
                {invoice.client?.email && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Email:</span> {invoice.client.email}
                  </p>
                )}
              </div>
            </div>

            {invoice.client?.shippingAddress && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Ship To</h3>
                <div className="space-y-1">
                  <p className="font-bold text-gray-900 text-base">{invoice.client?.companyName}</p>
                  <p className="text-sm text-gray-600">{invoice.client.shippingAddress}</p>
                  {invoice.client?.shippingCity && invoice.client?.shippingState && (
                    <p className="text-sm text-gray-600">
                      {invoice.client.shippingCity}, {invoice.client.shippingState}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b border-gray-200 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Invoice Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Due Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Payment Terms</p>
              <p className="font-semibold text-gray-900">
                {Math.ceil(
                  (new Date(invoice.dueDate) - new Date(invoice.invoiceDate)) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                Days
              </p>
            </div>
          </div>

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
                    <td className="py-3 px-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.hsnSacCode || '-'}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">
                      ₹{item.rate?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-gray-600">
                      {item.gstRate}%
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-900">
                      ₹{item.amount?.toLocaleString('en-IN')}
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
                  ₹{invoice.subtotal?.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    Discount
                    {invoice.discountType === 'PERCENTAGE'
                      ? ` (${invoice.discountValue}%)`
                      : ''}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    - ₹{invoice.discountAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.cgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">CGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.cgst?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.sgst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">SGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.sgst?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {invoice.igst > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">IGST</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{invoice.igst?.toLocaleString('en-IN')}
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
                  ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Paid Amount</span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{invoice.paidAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 px-4 rounded-lg">
                    <span className="text-sm font-bold text-red-900">Balance Due</span>
                    <span className="text-sm font-bold text-red-600">
                      ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Amount in Words */}
          {organization?.displaySettings?.amountInWords !== false && invoice.amountInWords && (
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-xs text-gray-500 uppercase mb-1">Amount in Words</p>
              <p className="font-semibold text-gray-900">{invoice.amountInWords}</p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8 pt-6 border-t border-gray-200 bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Terms & Conditions</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>1. Payment is due within the specified due date.</p>
              <p>2. Please include invoice number with payment.</p>
              <p>3. Late payments may incur additional charges.</p>
              <p>4. Goods once sold cannot be returned or exchanged.</p>
            </div>
          </div>

          {/* Bank Details */}
          {organization?.bankDetails && organization?.displaySettings?.showBankDetails !== false && (
            <div className="mb-8 bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-700 uppercase mb-3">Bank Details for Payment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {organization.bankDetails.bankName && (
                  <div>
                    <span className="text-gray-600">Bank Name:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.bankName}</span>
                  </div>
                )}
                {organization.bankDetails.accountHolderName && (
                  <div>
                    <span className="text-gray-600">Account Holder:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.accountHolderName}</span>
                  </div>
                )}
                {organization.bankDetails.accountNumber && (
                  <div>
                    <span className="text-gray-600">Account Number:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.accountNumber}</span>
                  </div>
                )}
                {organization.bankDetails.ifscCode && (
                  <div>
                    <span className="text-gray-600">IFSC Code:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.ifscCode}</span>
                  </div>
                )}
                {organization.bankDetails.branchName && (
                  <div>
                    <span className="text-gray-600">Branch:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.branchName}</span>
                  </div>
                )}
                {organization.bankDetails.upiId && (
                  <div>
                    <span className="text-gray-600">UPI ID:</span>
                    <span className="ml-2 font-semibold text-gray-900">{organization.bankDetails.upiId}</span>
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
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${organization.authorizedSignatory.signatureImage}`}
                    alt="Authorized Signature"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <div className="inline-block border-t-2 border-gray-900 pt-2 px-8">
                <p className="text-xs text-gray-600">Authorized Signature</p>
                {organization?.authorizedSignatory?.name && (
                  <p className="text-sm font-semibold text-gray-900">{organization.authorizedSignatory.name}</p>
                )}
                {organization?.authorizedSignatory?.designation && (
                  <p className="text-xs text-gray-600">{organization.authorizedSignatory.designation}</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              This is a computer generated invoice and does not require a physical signature.
            </p>
            {organization?.email && organization?.phone && (
              <p className="text-xs text-gray-500 mt-1">
                For any queries, please contact: {organization.email} | {organization.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      

      {/* ✅ PHASE 4: UPI QR Code Modal */}
      {showUpiQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">UPI Payment QR Code</h3>
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
                  ₹{invoice.balanceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = upiQrCode;
                      link.download = `UPI_QR_${invoice.invoiceNumber}.png`;
                      link.click();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                  >
                    Save Image
                  </button>
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
    </Layout>
  );
}

function PaymentModal({ invoice, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: invoice.balanceAmount || 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (formData.amount > invoice.balanceAmount) {
      setError('Payment amount cannot exceed balance amount');
      return;
    }

    setLoading(true);
    try {
      // ✅ FIXED: Use correct payments endpoint that creates Payment records
      const response = await api.post('/api/payments', {
        invoiceId: invoice._id,
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
      });
      
      console.log('✅ Payment created:', response.data);
      alert('Payment recorded successfully!');
      onSuccess();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Failed to record payment');
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
          {/* Invoice Info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-gray-900">
                ₹{invoice.totalAmount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-semibold text-green-600">
                ₹{invoice.paidAmount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="text-gray-600">Balance Due:</span>
              <span className="font-bold text-red-600">
                ₹{invoice.balanceAmount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Amount */}
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

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
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

          {/* Reference Number */}
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
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