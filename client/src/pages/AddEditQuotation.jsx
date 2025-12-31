// ============================================
// FILE: client/src/pages/AddEditQuotation.jsx
// COMPLETE FIX: Full backend compatibility
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

export default function AddEditQuotation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    clientId: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      {
        itemType: 'PRODUCT',
        product: '',
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        gstRate: 18,
        discountType: 'PERCENTAGE',
        discountValue: 0,
      },
    ],
    discountType: 'PERCENTAGE',
    discountValue: 0,
    notes: '',
    termsConditions: '',
  });

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchOrganization();
    if (isEdit) {
      fetchQuotation();
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await api.get('/api/organization/profile');
      setOrganization(response.data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchQuotation = async () => {
    try {
      const response = await api.get(`/api/quotations/${id}`);
      const quotation = response.data;
      setFormData({
        clientId: quotation.client._id,
        quotationDate: quotation.quotationDate.split('T')[0],
        validUntil: quotation.validUntil.split('T')[0],
        items: quotation.items.map(item => ({
          itemType: item.itemType,
          product: item.product?._id || '',
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gstRate: item.gstRate,
          discountType: item.discountType || 'PERCENTAGE',
          discountValue: item.discountValue || 0,
        })),
        discountType: quotation.discountType || 'PERCENTAGE',
        discountValue: quotation.discountValue || 0,
        notes: quotation.notes || '',
        termsConditions: quotation.termsConditions || '',
      });
    } catch (error) {
      console.error('Error fetching quotation:', error);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemType: 'PRODUCT',
          product: '',
          description: '',
          hsnSacCode: '',
          quantity: 1,
          unit: 'PCS',
          rate: 0,
          gstRate: 18,
          discountType: 'PERCENTAGE',
          discountValue: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const items = [...formData.items];
    items.splice(index, 1);
    setFormData({ ...formData, items });
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    
    // Handle numeric fields properly
    if (field === 'quantity' || field === 'rate' || field === 'gstRate' || field === 'discountValue') {
      const numValue = parseFloat(value);
      items[index][field] = isNaN(numValue) ? 0 : numValue;
    } else {
      items[index][field] = value;
    }

    // Auto-fill product details when product is selected
    if (field === 'product' && value) {
      const selectedProduct = products.find((p) => p._id === value);
      if (selectedProduct) {
        items[index].description = selectedProduct.name;
        items[index].hsnSacCode = selectedProduct.hsnSacCode;
        items[index].unit = selectedProduct.unit;
        items[index].rate = selectedProduct.rate || 0; // ✅ FIXED: Use 'rate' not 'sellingPrice'
        items[index].gstRate = selectedProduct.gstRate || 18;
      }
    }

    setFormData({ ...formData, items });
  };

  // ✅ Calculate full item details for backend
  const calculateFullItemDetails = (item, clientGstin, orgGstin) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;
    const discountValue = parseFloat(item.discountValue) || 0;
    
    // Base amount
    const baseAmount = quantity * rate;
    
    // Discount amount
    let discountAmount = 0;
    if (item.discountType === 'PERCENTAGE') {
      discountAmount = (baseAmount * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }
    
    // Taxable amount
    const taxableAmount = baseAmount - discountAmount;
    
    // Determine if IGST or CGST+SGST
    const isInterState = clientGstin && orgGstin && 
                         clientGstin.substring(0, 2) !== orgGstin.substring(0, 2);
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    
    if (isInterState) {
      igst = (taxableAmount * gstRate) / 100;
    } else {
      cgst = (taxableAmount * gstRate) / 200; // Half of GST
      sgst = (taxableAmount * gstRate) / 200; // Half of GST
    }
    
    const totalTax = cgst + sgst + igst;
    const totalAmount = taxableAmount + totalTax;
    
    return {
      itemType: item.itemType,
      description: item.description,
      hsnSacCode: item.hsnSacCode,
      quantity: quantity,
      unit: item.unit,
      rate: rate,
      discountType: item.discountType,
      discountValue: discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      baseAmount: parseFloat(baseAmount.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      amount: parseFloat(taxableAmount.toFixed(2)), // Required field
      gstRate: gstRate,
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get client and organization GSTIN
      const client = clients.find(c => c._id === formData.clientId);
      const clientGstin = client?.gstin || '';
      const orgGstin = organization?.gstin || '';

      // Calculate full item details for all items
      const calculatedItems = formData.items.map(item => 
        calculateFullItemDetails(item, clientGstin, orgGstin)
      );

      // Calculate totals
      const subtotal = calculatedItems.reduce((sum, item) => sum + item.baseAmount, 0);
      
      let invoiceDiscountAmount = 0;
      if (formData.discountType === 'PERCENTAGE') {
        invoiceDiscountAmount = (subtotal * formData.discountValue) / 100;
      } else {
        invoiceDiscountAmount = formData.discountValue || 0;
      }

      const taxableAmount = subtotal - invoiceDiscountAmount;
      const totalTax = calculatedItems.reduce((sum, item) => sum + item.cgst + item.sgst + item.igst, 0);
      const totalAmount = taxableAmount + totalTax;
      const roundOff = Math.round(totalAmount) - totalAmount;
      const finalTotal = Math.round(totalAmount);

      // Prepare data for backend
      const quotationData = {
        clientId: formData.clientId,
        quotationDate: formData.quotationDate,
        validUntil: formData.validUntil,
        items: calculatedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        discountAmount: parseFloat(invoiceDiscountAmount.toFixed(2)),
        cgst: parseFloat(calculatedItems.reduce((sum, item) => sum + item.cgst, 0).toFixed(2)),
        sgst: parseFloat(calculatedItems.reduce((sum, item) => sum + item.sgst, 0).toFixed(2)),
        igst: parseFloat(calculatedItems.reduce((sum, item) => sum + item.igst, 0).toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        roundOff: parseFloat(roundOff.toFixed(2)),
        totalAmount: finalTotal,
        notes: formData.notes,
        termsConditions: formData.termsConditions,
      };

      console.log('Sending quotation data:', quotationData);

      if (isEdit) {
        await api.put(`/api/quotations/${id}`, quotationData);
        alert('Quotation updated successfully!');
      } else {
        await api.post('/api/quotations', quotationData);
        alert('Quotation created successfully!');
      }
      navigate('/quotations');
    } catch (error) {
      console.error('Error saving quotation:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  // Display calculations (for UI only)
  const calculateItemTotal = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;
    const discountValue = parseFloat(item.discountValue) || 0;
    
    const baseAmount = quantity * rate;
    
    let discountAmount = 0;
    if (item.discountType === 'PERCENTAGE') {
      discountAmount = (baseAmount * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }
    
    const taxableAmount = baseAmount - discountAmount;
    const gstAmount = (taxableAmount * gstRate) / 100;
    
    return taxableAmount + gstAmount;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (quantity * rate);
    }, 0);

    const discountValue = parseFloat(formData.discountValue) || 0;
    let discountAmount = 0;
    if (formData.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    const taxableAmount = subtotal - discountAmount;

    const totalTax = formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      const itemDiscountValue = parseFloat(item.discountValue) || 0;
      
      const itemBase = quantity * rate;
      let itemDiscount = 0;
      if (item.discountType === 'PERCENTAGE') {
        itemDiscount = (itemBase * itemDiscountValue) / 100;
      } else {
        itemDiscount = itemDiscountValue;
      }
      const itemTaxable = itemBase - itemDiscount;
      return sum + (itemTaxable * gstRate) / 100;
    }, 0);

    const total = taxableAmount + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      totalTax: totalTax.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Quotation' : 'New Quotation'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Items</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <div className="grid grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={item.itemType}
                        onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="PRODUCT">Product</option>
                        <option value="SERVICE">Service</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {item.itemType === 'PRODUCT' ? 'Product' : 'Service'}
                      </label>
                      <select
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select or enter manually</option>
                        {products
                          .filter((p) => p.type === item.itemType)
                          .map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">HSN/SAC</label>
                      <input
                        type="text"
                        value={item.hsnSacCode}
                        onChange={(e) => handleItemChange(index, 'hsnSacCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                      <select
                        value={item.gstRate}
                        onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                      <input
                        type="text"
                        value={`₹${calculateItemTotal(item).toFixed(2)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium">-₹{totals.discountAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="font-medium">₹{totals.taxableAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Tax:</span>
                <span className="font-medium">₹{totals.totalTax}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>₹{totals.total}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Any notes or special instructions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.termsConditions}
                  onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEdit ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}