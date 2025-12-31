// ============================================
// FILE: client/src/pages/CreditDebitNotes.jsx
// COMPLETE - With Creation Form for Non-Developers
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { FileText, Plus, Eye, Trash2, Calendar, AlertCircle, X } from 'lucide-react';

export default function CreditDebitNotes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('credit'); // credit, debit
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [invoices, setInvoices] = useState([]);
  const [formData, setFormData] = useState({
    invoiceId: '',
    reason: '',
    reasonDescription: '',
    notes: '',
    items: [
      {
        description: '',
        hsnSacCode: '998314',
        quantity: 1,
        unit: 'UNIT',
        rate: 0,
        gstRate: 18,
        itemType: 'SERVICE',
        amount: 0,
      },
    ],
  });

  useEffect(() => {
    fetchNotes();
    fetchInvoices();
  }, [activeTab]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === 'credit' ? '/api/credit-debit-notes/credit-notes' : '/api/credit-debit-notes/debit-notes';
      const response = await api.get(endpoint);
      setNotes(response.data || []);
    } catch (error) {
      console.error(`Error fetching ${activeTab} notes:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/api/invoices');
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${activeTab} note?`)) return;

    try {
      const endpoint =
        activeTab === 'credit'
          ? `/api/credit-debit-notes/credit-notes/${id}`
          : `/api/credit-debit-notes/debit-notes/${id}`;
      await api.delete(endpoint);
      alert(`${activeTab === 'credit' ? 'Credit' : 'Debit'} note deleted successfully`);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  const handleOpenModal = () => {
    setFormData({
      invoiceId: '',
      reason: '',
      reasonDescription: '',
      notes: '',
      items: [
        {
          description: '',
          hsnSacCode: '998314',
          quantity: 1,
          unit: 'UNIT',
          rate: 0,
          gstRate: 18,
          itemType: 'SERVICE',
          amount: 0,
        },
      ],
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;

    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const rate = parseFloat(updatedItems[index].rate) || 0;
      updatedItems[index].amount = quantity * rate;
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: '',
          hsnSacCode: '998314',
          quantity: 1,
          unit: 'UNIT',
          rate: 0,
          gstRate: 18,
          itemType: 'SERVICE',
          amount: 0,
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      alert('At least one item is required');
      return;
    }
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoiceId) {
      alert('Please select an invoice');
      return;
    }

    if (!formData.reason) {
      alert('Please select a reason');
      return;
    }

    // Validate items
    for (let item of formData.items) {
      if (!item.description) {
        alert('Please enter description for all items');
        return;
      }
      if (item.quantity <= 0 || item.rate <= 0) {
        alert('Quantity and rate must be greater than 0');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint =
        activeTab === 'credit'
          ? '/api/credit-debit-notes/credit-notes'
          : '/api/credit-debit-notes/debit-notes';

      await api.post(endpoint, formData);

      alert(
        `${activeTab === 'credit' ? 'Credit' : 'Debit'} note created successfully!`
      );
      handleCloseModal();
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      alert(`Failed to create ${activeTab} note: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const creditReasons = [
    { value: 'GOODS_RETURNED', label: 'Goods Returned' },
    { value: 'SERVICE_DEFICIENCY', label: 'Service Deficiency' },
    { value: 'DISCOUNT', label: 'Discount' },
    { value: 'POST_SALE_DISCOUNT', label: 'Post-Sale Discount' },
    { value: 'PRICE_ADJUSTMENT', label: 'Price Adjustment' },
    { value: 'CANCELLATION', label: 'Cancellation' },
    { value: 'OTHER', label: 'Other' },
  ];

  const debitReasons = [
    { value: 'ADDITIONAL_CHARGES', label: 'Additional Charges' },
    { value: 'PRICE_INCREASE', label: 'Price Increase' },
    { value: 'INTEREST_ON_DELAYED_PAYMENT', label: 'Interest on Delayed Payment' },
    { value: 'SHORT_SUPPLY', label: 'Short Supply' },
    { value: 'PENALTY', label: 'Penalty' },
    { value: 'OTHER', label: 'Other' },
  ];

  const totalAmount = notes.reduce((sum, note) => sum + note.totalAmount, 0);

  if (loading && !showModal) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credit & Debit Notes</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage invoice adjustments and additional charges
            </p>
          </div>

          {/* ENABLED BUTTON - Now has working form! */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New {activeTab === 'credit' ? 'Credit' : 'Debit'} Note
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{notes.length}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    activeTab === 'credit' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {activeTab === 'credit' ? '-' : '+'}₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <FileText
                className={`w-10 h-10 ${
                  activeTab === 'credit' ? 'text-red-600' : 'text-green-600'
                }`}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {
                    notes.filter((n) => {
                      const noteDate = new Date(
                        activeTab === 'credit' ? n.creditNoteDate : n.debitNoteDate
                      );
                      const now = new Date();
                      return (
                        noteDate.getMonth() === now.getMonth() &&
                        noteDate.getFullYear() === now.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('credit')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'credit'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Credit Notes
              </button>
              <button
                onClick={() => setActiveTab('debit')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'debit'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Debit Notes
              </button>
            </div>
          </div>

          {/* Notes Table */}
          <div className="p-6">
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No {activeTab} notes yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Click "New {activeTab === 'credit' ? 'Credit' : 'Debit'} Note" to create one
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        {activeTab === 'credit' ? 'Credit Note #' : 'Debit Note #'}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Client
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Original Invoice
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Reason
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Amount
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {notes.map((note) => (
                      <tr key={note._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            {note.creditNoteNumber || note.debitNoteNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(
                            note.creditNoteDate || note.debitNoteDate
                          ).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {note.client?.companyName || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              navigate(`/invoices/view/${note.originalInvoice?._id}`)
                            }
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {note.originalInvoice?.invoiceNumber || 'N/A'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{note.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              activeTab === 'credit' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {activeTab === 'credit' ? '-' : '+'}₹
                            {note.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              note.status === 'ISSUED'
                                ? 'bg-green-100 text-green-700'
                                : note.status === 'APPLIED'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {note.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDelete(note._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Create {activeTab === 'credit' ? 'Credit' : 'Debit'} Note
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Invoice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Invoice *
                </label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Invoice</option>
                  {invoices.map((inv) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} - {inv.client?.companyName} - ₹
                      {inv.totalAmount?.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Reason</option>
                    {(activeTab === 'credit' ? creditReasons : debitReasons).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason Description
                  </label>
                  <input
                    type="text"
                    value={formData.reasonDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, reasonDescription: e.target.value })
                    }
                    placeholder="Optional detailed explanation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                          Item {index + 1}
                        </h4>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Description *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(index, 'description', e.target.value)
                            }
                            placeholder="Item description"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            HSN/SAC Code
                          </label>
                          <input
                            type="text"
                            value={item.hsnSacCode}
                            onChange={(e) =>
                              handleItemChange(index, 'hsnSacCode', e.target.value)
                            }
                            placeholder="998314"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', e.target.value)
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Unit *</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="PCS">PCS</option>
                            <option value="KG">KG</option>
                            <option value="LITER">LITER</option>
                            <option value="METER">METER</option>
                            <option value="BOX">BOX</option>
                            <option value="HOUR">HOUR</option>
                            <option value="DAY">DAY</option>
                            <option value="MONTH">MONTH</option>
                            <option value="SET">SET</option>
                            <option value="UNIT">UNIT</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Rate *</label>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            GST Rate *
                          </label>
                          <select
                            value={item.gstRate}
                            onChange={(e) =>
                              handleItemChange(index, 'gstRate', parseInt(e.target.value))
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Type *</label>
                          <select
                            value={item.itemType}
                            onChange={(e) =>
                              handleItemChange(index, 'itemType', e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="SERVICE">Service</option>
                            <option value="PRODUCT">Product</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Amount</label>
                          <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 font-medium">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? 'Creating...' : `Create ${activeTab === 'credit' ? 'Credit' : 'Debit'} Note`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}