// ============================================
// FILE: client/src/pages/ViewPO.jsx
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CreditCard,
  Package,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function ViewPO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      const response = await api.get(`/api/purchase-orders/${id}`);
      setPO(response.data);
    } catch (error) {
      console.error('Error fetching PO:', error);
      alert('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/purchase-orders/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this purchase order?')) return;

    try {
      await api.delete(`/api/purchase-orders/${id}`);
      alert('Purchase order deleted successfully');
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error deleting PO:', error);
      alert('Failed to delete purchase order');
    }
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

  if (!po) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Purchase Order not found</p>
          <button
            onClick={() => navigate('/purchase-orders')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Purchase Orders
          </button>
        </div>
      </Layout>
    );
  }

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PARTIALLY_RECEIVED: 'bg-blue-100 text-blue-700',
    RECEIVED: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="print:hidden">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Purchase Orders
          </button>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-3">
              {po.status !== 'PAID' && po.status !== 'CANCELLED' && (
                <>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <CreditCard className="w-4 h-4" />
                    Record Payment
                  </button>

                  <button
                    onClick={() => setShowReceiveModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Package className="w-4 h-4" />
                    Receive Items
                  </button>
                </>
              )}

              <button
                onClick={handleEdit}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>

              {po.status !== 'PAID' && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PO Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
              <p className="text-gray-600 mt-1">
                {po.vendor?.companyName || 'Unknown Vendor'}
              </p>
            </div>
            <span
              className={`px-4 py-2 text-sm font-medium rounded-full ${
                statusColors[po.status]
              }`}
            >
              {po.status?.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
            <div>
              <p className="text-xs text-gray-500 mb-1">PO Date</p>
              <p className="font-medium">
                {new Date(po.poDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            {po.expectedDeliveryDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Expected Delivery</p>
                <p className="font-medium">
                  {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}
            {po.actualDeliveryDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Actual Delivery</p>
                <p className="font-medium">
                  {new Date(po.actualDeliveryDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                      Description
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">
                      Ordered
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">
                      Received
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">
                      Balance
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                      Rate
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-3">
                        <p className="font-medium text-sm">{item.description}</p>
                        {item.hsnSacCode && (
                          <p className="text-xs text-gray-500">
                            HSN: {item.hsnSacCode}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-sm">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-center text-sm">
                        <span
                          className={
                            item.receivedQuantity >= item.quantity
                              ? 'text-green-600 font-semibold'
                              : 'text-gray-600'
                          }
                        >
                          {item.receivedQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-sm">
                        <span
                          className={
                            item.balanceQuantity > 0
                              ? 'text-red-600 font-semibold'
                              : 'text-green-600'
                          }
                        >
                          {item.balanceQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-sm">
                        ₹{item.rate.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-medium">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-80 space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="font-medium">
                  ₹{po.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-gray-600">GST</span>
                <span className="font-medium">
                  ₹{po.gstAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-blue-600 text-white px-4 rounded-lg">
                <span className="font-bold">Total Value</span>
                <span className="font-bold">
                  ₹{po.totalValue.toLocaleString('en-IN')}
                </span>
              </div>
              {po.paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-2 border-t">
                    <span className="text-sm text-gray-600">Paid Amount</span>
                    <span className="font-medium text-green-600">
                      ₹{po.paidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 px-4 rounded-lg">
                    <span className="font-bold text-red-900">Balance Due</span>
                    <span className="font-bold text-red-600">
                      ₹{po.balanceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment History */}
          {po.payments?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Payment History</h3>
              <div className="space-y-2">
                {po.payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(payment.paymentDate).toLocaleDateString('en-IN')}{' '}
                        • {payment.paymentMode}
                        {payment.referenceNumber &&
                          ` • Ref: ${payment.referenceNumber}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Invoices */}
          {po.linkedInvoices?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Linked Invoices</h3>
              <div className="flex flex-wrap gap-2">
                {po.linkedInvoices.map((link, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {link.invoiceNumber}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {po.notes && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {po.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          po={po}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchPO();
          }}
        />
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && (
        <ReceiveModal
          po={po}
          onClose={() => setShowReceiveModal(false)}
          onSuccess={() => {
            setShowReceiveModal(false);
            fetchPO();
          }}
        />
      )}
    </Layout>
  );
}

function PaymentModal({ po, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: po.balanceAmount,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/api/purchase-orders/${po._id}/payment`, formData);
      alert('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Record Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Value:</span>
              <span className="font-semibold">
                ₹{po.totalValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-semibold text-green-600">
                ₹{po.paidAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
              <span className="text-gray-600">Balance Due:</span>
              <span className="font-bold text-red-600">
                ₹{po.balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData({ ...formData, paymentDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode *
            </label>
            <select
              required
              value={formData.paymentMode}
              onChange={(e) =>
                setFormData({ ...formData, paymentMode: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
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
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReceiveModal({ po, onClose, onSuccess }) {
  const [receivedItems, setReceivedItems] = useState(
    po.items.map((item) => ({
      itemId: item._id,
      receivedQuantity: item.receivedQuantity,
      maxQuantity: item.quantity,
    }))
  );
  const [actualDeliveryDate, setActualDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/api/purchase-orders/${po._id}/receive`, {
        receivedItems,
        actualDeliveryDate,
      });
      alert('Items received successfully');
      onSuccess();
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Failed to update received quantities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Receive Items</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Delivery Date
            </label>
            <input
              type="date"
              value={actualDeliveryDate}
              onChange={(e) => setActualDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Update Received Quantities</h4>
            {po.items.map((item, index) => (
              <div
                key={item._id}
                className="p-4 border rounded-lg bg-gray-50 space-y-2"
              >
                <p className="font-medium text-sm">{item.description}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Ordered</p>
                    <p className="font-semibold">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Previously Received</p>
                    <p className="font-semibold">{item.receivedQuantity}</p>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">
                      Received Now
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={receivedItems[index].receivedQuantity}
                      onChange={(e) => {
                        const newItems = [...receivedItems];
                        newItems[index].receivedQuantity = parseInt(
                          e.target.value
                        );
                        setReceivedItems(newItems);
                      }}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Quantities'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}