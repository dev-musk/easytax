// ============================================
// FILE: client/src/pages/AddEditInvoice.jsx
// PHASE 4 - With Duplicate Invoice Handling
// ============================================

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom"; // ✅ Added useLocation
import Layout from "../components/Layout";
import api from "../utils/api";
import { ArrowLeft, Save, Plus, Minus, Package, Percent } from "lucide-react";

// ✅ NUMBER TO WORDS CONVERTER - CLIENT SIDE
const convertTwoDigit = (n) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  const tenDigit = Math.floor(n / 10);
  const oneDigit = n % 10;
  return tens[tenDigit] + (oneDigit > 0 ? ' ' + ones[oneDigit] : '');
};

const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  num = Math.floor(num);

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let words = '';

  if (crore > 0) {
    if (crore > 99) {
      words += numberToWords(crore).replace(' Rupees Only', '') + ' Crore ';
    } else {
      words += convertTwoDigit(crore) + ' Crore ';
    }
  }

  if (lakh > 0) words += convertTwoDigit(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigit(thousand) + ' Thousand ';
  if (hundred > 0) words += convertTwoDigit(hundred) + ' Hundred ';
  if (remainder > 0) {
    if (words.length > 0) words += 'and ';
    words += convertTwoDigit(remainder) + ' ';
  }

  return words.trim() + ' Rupees Only';
};

const amountToWords = (amount) => {
  amount = Math.round(amount * 100) / 100;
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = numberToWords(rupees);

  if (paise > 0) {
    words = words.replace(' Only', '') + ' and ' + convertTwoDigit(paise) + ' Paise Only';
  }

  return words;
};

export default function AddEditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation(); // ✅ PHASE 4: Get location state
  const isEditing = !!id;
  
  // ✅ PHASE 4: Get duplicate data from location state
  const duplicateData = location.state?.duplicateFrom;
  const isDuplicate = location.state?.isDuplicate;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [tdsConfigs, setTdsConfigs] = useState([]);
  
  const [formData, setFormData] = useState({
    clientId: "",
    invoiceType: "TAX_INVOICE",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    items: [
      {
        productId: "",
        description: "",
        hsnSacCode: "",
        quantity: 1,
        unit: "PCS",
        rate: 0,
        gstRate: 18,
        itemType: "PRODUCT",
        discountType: "PERCENTAGE",
        discountValue: 0,
        discountAmount: 0,
        taxableAmount: 0,
        amount: 0,
      },
    ],
    discountType: "PERCENTAGE",
    discountValue: 0,
    tdsSection: "",
    tdsRate: 0,
    tdsAmount: 0,
    notes: "",
    eInvoice: {
      enabled: false,
      irn: '',
      ackNo: '',
      ackDate: '',
      status: 'NOT_GENERATED',
    },
    eWayBill: {
      enabled: false,
      ewbNumber: '',
      ewbDate: '',
      validUpto: '',
      transportMode: 'ROAD',
      vehicleNumber: '',
      distance: 0,
      transporterName: '',
      status: 'NOT_GENERATED',
    },
    template: 'MODERN',
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchTDSConfigs();
    
    if (isEditing) {
      fetchInvoice();
    } else if (isDuplicate && duplicateData) {
      // ✅ PHASE 4: Pre-fill form with duplicate data
      console.log('📋 Duplicating invoice:', duplicateData);
      setFormData({
        clientId: duplicateData.client?._id || "",
        invoiceType: duplicateData.invoiceType,
        invoiceDate: new Date().toISOString().split("T")[0], // Today's date
        dueDate: "", // Clear due date for user to set
        items: duplicateData.items?.map((item) => ({
          ...item,
          productId: "",
          discountType: item.discountType || "PERCENTAGE",
          discountValue: item.discountValue || 0,
          discountAmount: item.discountAmount || 0,
          taxableAmount: item.taxableAmount || item.amount,
        })) || [],
        discountType: duplicateData.discountType || "PERCENTAGE",
        discountValue: duplicateData.discountValue || 0,
        tdsSection: duplicateData.tdsSection || "",
        tdsRate: duplicateData.tdsRate || 0,
        tdsAmount: 0, // Recalculated on submit
        notes: duplicateData.notes || "",
        // Don't copy E-Invoice/E-Way Bill data
        eInvoice: {
          enabled: false,
          irn: '',
          ackNo: '',
          ackDate: '',
          status: 'NOT_GENERATED',
        },
        eWayBill: {
          enabled: false,
          ewbNumber: '',
          ewbDate: '',
          validUpto: '',
          transportMode: 'ROAD',
          vehicleNumber: '',
          distance: 0,
          transporterName: '',
          status: 'NOT_GENERATED',
        },
        template: duplicateData.template || 'MODERN',
      });
    }
  }, [id, isDuplicate, duplicateData]);

  const fetchClients = async () => {
    try {
      const response = await api.get("/api/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products", {
        params: { isActive: "true" },
      });
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchTDSConfigs = async () => {
    try {
      const response = await api.get("/api/tdsconfig");
      setTdsConfigs(response.data || []);
    } catch (error) {
      console.error("Error fetching TDS configs:", error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/api/invoices/${id}`);
      setFormData({
        clientId: response.data.client?._id || "",
        invoiceType: response.data.invoiceType,
        invoiceDate: response.data.invoiceDate?.split("T")[0],
        dueDate: response.data.dueDate?.split("T")[0],
        items:
          response.data.items?.map((item) => ({
            ...item,
            productId: "",
            discountType: item.discountType || "PERCENTAGE",
            discountValue: item.discountValue || 0,
            discountAmount: item.discountAmount || 0,
            taxableAmount: item.taxableAmount || item.amount,
          })) || [],
        discountType: response.data.discountType || "PERCENTAGE",
        discountValue: response.data.discountValue || 0,
        tdsSection: response.data.tdsSection || "",
        tdsRate: response.data.tdsRate || 0,
        tdsAmount: response.data.tdsAmount || 0,
        notes: response.data.notes || "",
        eInvoice: response.data.eInvoice || {
          enabled: false,
          irn: '',
          ackNo: '',
          ackDate: '',
          status: 'NOT_GENERATED',
        },
        eWayBill: response.data.eWayBill || {
          enabled: false,
          ewbNumber: '',
          ewbDate: '',
          validUpto: '',
          transportMode: 'ROAD',
          vehicleNumber: '',
          distance: 0,
          transporterName: '',
          status: 'NOT_GENERATED',
        },
        template: response.data.template || 'MODERN',
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      alert("Failed to fetch invoice details");
      navigate("/invoices");
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: "",
          description: "",
          hsnSacCode: "",
          quantity: 1,
          unit: "PCS",
          rate: 0,
          gstRate: 18,
          itemType: "PRODUCT",
          discountType: "PERCENTAGE",
          discountValue: 0,
          discountAmount: 0,
          taxableAmount: 0,
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

  const handleProductSelect = (index, productId) => {
    const newItems = [...formData.items];

    if (productId === "custom") {
      newItems[index] = {
        productId: "custom",
        description: "",
        hsnSacCode: "",
        quantity: 1,
        unit: "PCS",
        rate: 0,
        gstRate: 18,
        itemType: "PRODUCT",
        discountType: "PERCENTAGE",
        discountValue: 0,
        discountAmount: 0,
        taxableAmount: 0,
        amount: 0,
      };
    } else if (productId) {
      const product = products.find((p) => p._id === productId);
      if (product) {
        const quantity = newItems[index].quantity || 1;
        const rate = product.rate;
        const baseAmount = quantity * rate;

        newItems[index] = {
          productId: product._id,
          description: product.name,
          hsnSacCode: product.hsnSacCode || "",
          quantity: quantity,
          unit: product.unit,
          rate: rate,
          gstRate: product.gstRate,
          itemType: product.type,
          discountType: "PERCENTAGE",
          discountValue: 0,
          discountAmount: 0,
          taxableAmount: baseAmount,
          amount: baseAmount,
        };
      }
    } else {
      newItems[index].productId = "";
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateItemAmount = (item) => {
    const baseAmount = item.quantity * item.rate;
    let discountAmount = 0;

    if (item.discountType === "PERCENTAGE") {
      discountAmount = (baseAmount * item.discountValue) / 100;
    } else {
      discountAmount = item.discountValue;
    }

    const taxableAmount = baseAmount - discountAmount;
    const amount = taxableAmount;

    return {
      discountAmount,
      taxableAmount,
      amount,
    };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (["quantity", "rate", "discountType", "discountValue"].includes(field)) {
      const calculated = calculateItemAmount(newItems[index]);
      newItems[index].discountAmount = calculated.discountAmount;
      newItems[index].taxableAmount = calculated.taxableAmount;
      newItems[index].amount = calculated.amount;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleTDSChange = (tdsSection) => {
    if (tdsSection) {
      const config = tdsConfigs.find((c) => c.section === tdsSection);
      if (config) {
        setFormData({
          ...formData,
          tdsSection: config.section,
          tdsRate: config.rate,
        });
      }
    } else {
      setFormData({
        ...formData,
        tdsSection: "",
        tdsRate: 0,
      });
    }
  };

  const calculateTotals = () => {
    const itemsTotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const itemDiscounts = formData.items.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);

    let invoiceDiscountAmount = 0;
    if (formData.discountType === "PERCENTAGE") {
      invoiceDiscountAmount = (subtotal * formData.discountValue) / 100;
    } else {
      invoiceDiscountAmount = formData.discountValue;
    }

    const taxableAmount = subtotal - invoiceDiscountAmount;

    const totalTax = formData.items.reduce((sum, item) => {
      const itemTaxableAmount =
        item.amount - (item.amount * formData.discountValue) / 100;
      return sum + (itemTaxableAmount * item.gstRate) / 100;
    }, 0);

    const totalWithTax = taxableAmount + totalTax;
    const tdsAmount = (taxableAmount * formData.tdsRate) / 100;
    const total = totalWithTax - tdsAmount;

    return {
      itemsTotal,
      itemDiscounts,
      subtotal,
      invoiceDiscountAmount,
      taxableAmount,
      totalTax,
      totalWithTax,
      tdsAmount,
      total,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totals = calculateTotals();

      const invoiceData = {
        clientId: formData.clientId,
        invoiceType: formData.invoiceType,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        items: formData.items.map(({ productId, ...item }) => item),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        tdsSection: formData.tdsSection || null,
        tdsRate: formData.tdsRate || 0,
        tdsAmount: totals.tdsAmount || 0,
        notes: formData.notes,
        eInvoice: formData.eInvoice,
        eWayBill: formData.eWayBill,
        template: formData.template,
      };

      console.log("Submitting invoice data:", invoiceData);

      if (isEditing) {
        await api.put(`/api/invoices/${id}`, invoiceData);
        alert("Invoice updated successfully");
      } else {
        await api.post("/api/invoices", invoiceData);
        alert(isDuplicate ? "Duplicate invoice created successfully" : "Invoice created successfully");
      }
      navigate("/invoices");
    } catch (error) {
      console.error("Error saving invoice:", error);
      console.error("Error details:", error.response?.data);
      alert(error.response?.data?.error || "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>
          {/* ✅ PHASE 4: Updated title for duplicate */}
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Invoice" : isDuplicate ? "Duplicate Invoice" : "Create New Invoice"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing
              ? "Update invoice details"
              : isDuplicate
              ? "Creating a copy of existing invoice"
              : "Create a new invoice for your client"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Invoice Date <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
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
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Line Items
              </h2>
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

                  {/* Product Selection */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <label className="block text-xs font-medium text-blue-900 mb-2">
                      <Package className="w-4 h-4 inline mr-1" />
                      Select from Product Catalog (or choose Custom Item)
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        handleProductSelect(index, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Select Product/Service --</option>
                      <option value="custom">
                        ✏️ Custom Item (Manual Entry)
                      </option>
                      <optgroup label="Products">
                        {products
                          .filter((p) => p.type === "PRODUCT")
                          .map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} - ₹{product.rate} (
                              {product.gstRate}% GST)
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Services">
                        {products
                          .filter((p) => p.type === "SERVICE")
                          .map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} - ₹{product.rate} (
                              {product.gstRate}% GST)
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Type *
                      </label>
                      <select
                        required
                        value={item.itemType}
                        onChange={(e) =>
                          handleItemChange(index, "itemType", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="PRODUCT">Product</option>
                        <option value="SERVICE">Service</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        HSN/SAC
                      </label>
                      <input
                        type="text"
                        placeholder="998314"
                        value={item.hsnSacCode}
                        onChange={(e) =>
                          handleItemChange(index, "hsnSacCode", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Unit *
                      </label>
                      <select
                        required
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="PCS">Pcs</option>
                        <option value="KG">Kg</option>
                        <option value="LITER">Liter</option>
                        <option value="METER">Meter</option>
                        <option value="BOX">Box</option>
                        <option value="HOUR">Hour</option>
                        <option value="DAY">Day</option>
                        <option value="MONTH">Month</option>
                        <option value="SET">Set</option>
                        <option value="UNIT">Unit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Rate *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "rate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Item-level Discount & GST */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3 pt-2 border-t border-gray-200">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-orange-600 mb-1">
                        <Percent className="w-3 h-3 inline mr-1" />
                        Item Discount Type
                      </label>
                      <select
                        value={item.discountType}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "discountType",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-orange-50"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-orange-600 mb-1">
                        Discount Value
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discountValue}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "discountValue",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-orange-50"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        GST % *
                      </label>
                      <select
                        required
                        value={item.gstRate}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "gstRate",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>

                  {/* Item Summary */}
                  <div className="bg-white rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Base Amount (Qty × Rate):</span>
                      <span className="font-medium text-gray-900">
                        ₹
                        {(item.quantity * item.rate).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {item.discountAmount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>
                          Item Discount{" "}
                          {item.discountType === "PERCENTAGE"
                            ? `(${item.discountValue}%)`
                            : ""}
                          :
                        </span>
                        <span className="font-medium">
                          -₹
                          {item.discountAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-900 pt-1 border-t border-gray-200">
                      <span className="font-semibold">Taxable Amount:</span>
                      <span className="font-bold">
                        ₹
                        {item.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice-level Discount, TDS & Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Deductions & Notes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Discount Type
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
                  Invoice Discount Value
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Percent className="w-4 h-4 inline mr-1" />
                  TDS Section (Optional)
                </label>
                <select
                  value={formData.tdsSection}
                  onChange={(e) => handleTDSChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No TDS</option>
                  {tdsConfigs
                    .filter((config) => config.isActive)
                    .map((config) => (
                      <option key={config._id} value={config.section}>
                        {config.section} - {config.description} ({config.rate}%)
                      </option>
                    ))}
                </select>
                {formData.tdsSection && (
                  <p className="text-xs text-gray-500 mt-1">
                    TDS @ {formData.tdsRate}% will be deducted
                  </p>
                )}
              </div>
            </div>

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
                placeholder="Payment terms, bank details, or any additional notes..."
              />
            </div>
          </div>

          {/* ✅ PHASE 3: E-INVOICE SECTION */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="eInvoiceEnabled"
                  checked={formData.eInvoice?.enabled || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eInvoice: { ...formData.eInvoice, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="eInvoiceEnabled" className="text-sm font-semibold text-blue-900">
                  E-Invoice (Manual Entry)
                </label>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  For turnover &gt; ₹5 Crore
                </span>
              </div>

              {formData.eInvoice?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IRN (Invoice Reference Number)
                    </label>
                    <input
                      type="text"
                      value={formData.eInvoice?.irn || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: { ...formData.eInvoice, irn: e.target.value },
                        })
                      }
                      placeholder="Enter IRN from GST Portal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Acknowledgement Number
                    </label>
                    <input
                      type="text"
                      value={formData.eInvoice?.ackNo || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: { ...formData.eInvoice, ackNo: e.target.value },
                        })
                      }
                      placeholder="Ack No from GST Portal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ack Date
                    </label>
                    <input
                      type="date"
                      value={formData.eInvoice?.ackDate?.split('T')[0] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: { ...formData.eInvoice, ackDate: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.eInvoice?.status || 'NOT_GENERATED'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: { ...formData.eInvoice, status: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NOT_GENERATED">Not Generated</option>
                      <option value="GENERATED">Generated</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="text-xs text-blue-600 mt-3">
                💡 Manual mode: Enter details from GST Portal. API integration coming soon.
              </p>
            </div>
          </div>

          {/* ✅ PHASE 3: E-WAY BILL SECTION */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="eWayBillEnabled"
                  checked={formData.eWayBill?.enabled || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eWayBill: { ...formData.eWayBill, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-green-600"
                />
                <label htmlFor="eWayBillEnabled" className="text-sm font-semibold text-green-900">
                  E-Way Bill (Manual Entry)
                </label>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  For goods &gt; ₹50,000
                </span>
              </div>

              {formData.eWayBill?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Way Bill Number
                    </label>
                    <input
                      type="text"
                      value={formData.eWayBill?.ewbNumber || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, ewbNumber: e.target.value },
                        })
                      }
                      placeholder="Enter EWB Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EWB Date
                    </label>
                    <input
                      type="date"
                      value={formData.eWayBill?.ewbDate?.split('T')[0] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, ewbDate: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Upto
                    </label>
                    <input
                      type="date"
                      value={formData.eWayBill?.validUpto?.split('T')[0] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, validUpto: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transport Mode
                    </label>
                    <select
                      value={formData.eWayBill?.transportMode || 'ROAD'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, transportMode: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="ROAD">Road</option>
                      <option value="RAIL">Rail</option>
                      <option value="AIR">Air</option>
                      <option value="SHIP">Ship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={formData.eWayBill?.vehicleNumber || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, vehicleNumber: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="e.g., MH12AB1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance (KM)
                    </label>
                    <input
                      type="number"
                      value={formData.eWayBill?.distance || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, distance: parseFloat(e.target.value) || 0 },
                        })
                      }
                      placeholder="Distance in KM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transporter Name
                    </label>
                    <input
                      type="text"
                      value={formData.eWayBill?.transporterName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, transporterName: e.target.value },
                        })
                      }
                      placeholder="Transporter name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.eWayBill?.status || 'NOT_GENERATED'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: { ...formData.eWayBill, status: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="NOT_GENERATED">Not Generated</option>
                      <option value="GENERATED">Generated</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="text-xs text-green-600 mt-3">
                💡 Manual mode: Enter details from E-Way Bill Portal. API integration coming soon.
              </p>
            </div>
          </div>

          {/* Invoice Summary - WITH AMOUNT IN WORDS */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items Total:</span>
                  <span className="font-medium text-gray-900">
                    ₹
                    {totals.itemsTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {totals.itemDiscounts > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Item Discounts:</span>
                    <span className="font-medium text-orange-600">
                      -₹
                      {totals.itemDiscounts.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal (after item discounts):
                  </span>
                  <span className="font-medium text-gray-900">
                    ₹
                    {totals.subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {totals.invoiceDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Invoice Discount{" "}
                      {formData.discountType === "PERCENTAGE"
                        ? `(${formData.discountValue}%)`
                        : ""}
                      :
                    </span>
                    <span className="font-medium text-red-600">
                      -₹
                      {totals.invoiceDiscountAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Taxable Amount:</span>
                  <span className="font-medium text-gray-900">
                    ₹
                    {totals.taxableAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST:</span>
                  <span className="font-medium text-gray-900">
                    ₹
                    {totals.totalTax.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Total (with GST):</span>
                  <span className="font-medium text-gray-900">
                    ₹
                    {totals.totalWithTax.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {totals.tdsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      TDS{" "}
                      {formData.tdsSection
                        ? `(${formData.tdsSection} @ ${formData.tdsRate}%)`
                        : ""}
                      :
                    </span>
                    <span className="font-medium text-orange-600">
                      -₹
                      {totals.tdsAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t-2 border-blue-300 flex justify-between">
                  <span className="font-semibold text-gray-900">
                    Net Payable:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹
                    {totals.total.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ AMOUNT IN WORDS - ADDED HERE! */}
            {totals.total > 0 && (
              <div className="mt-6 pt-4 border-t-2 border-blue-300">
                <div className="bg-blue-100 border-l-4 border-blue-600 rounded-r-lg p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-2">
                    Amount in Words
                  </p>
                  <p className="text-base font-bold text-blue-900">
                    {amountToWords(totals.total)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => navigate("/invoices")}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {loading
                ? "Saving..."
                : isEditing
                ? "Update Invoice"
                : isDuplicate
                ? "Create Duplicate"
                : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}