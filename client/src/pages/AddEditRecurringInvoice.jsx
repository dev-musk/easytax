// ============================================
// FILE: client/src/pages/AddEditRecurringInvoice.jsx
// NEW FILE - Create/Edit Recurring Invoice Templates
// ============================================

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../utils/api";
import { ArrowLeft, Save, Plus, Minus, Calendar, Percent } from "lucide-react";

export default function AddEditRecurringInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [tdsConfigs, setTdsConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    templateName: "",
    clientId: "",
    invoiceType: "TAX_INVOICE",
    frequency: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    nextInvoiceDate: new Date().toISOString().split("T")[0],
    items: [
      {
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
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchTDSConfigs();
    if (isEditing) {
      fetchTemplate();
    }
  }, [id]);

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
      const response = await api.get("/api/products");
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchTemplate = async () => {
    try {
      const response = await api.get(`/api/recurring-invoices/${id}`);
      const template = response.data;
      setFormData({
        templateName: template.templateName,
        clientId: template.client._id,
        invoiceType: template.invoiceType,
        frequency: template.frequency,
        startDate: template.startDate.split("T")[0],
        nextInvoiceDate: template.nextInvoiceDate.split("T")[0],
        items: template.items,
        discountType: template.discountType,
        discountValue: template.discountValue,
        tdsSection: template.tdsSection || "",
        tdsRate: template.tdsRate || 0,
        notes: template.notes || "",
        isActive: template.isActive,
      });
    } catch (error) {
      console.error("Error fetching template:", error);
      alert("Failed to fetch template");
      navigate("/recurring-invoices");
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

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
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

    if (productId) {
      const product = products.find((p) => p._id === productId);
      if (product) {
        const quantity = newItems[index].quantity || 1;
        const rate = product.rate;
        const baseAmount = quantity * rate;

        newItems[index] = {
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
    const tdsAmount = (totalWithTax * formData.tdsRate) / 100;
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
      const templateData = {
        templateName: formData.templateName,
        client: formData.clientId,
        invoiceType: formData.invoiceType,
        frequency: formData.frequency,
        startDate: formData.startDate,
        nextInvoiceDate: formData.nextInvoiceDate,
        items: formData.items,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        tdsSection: formData.tdsSection || null,
        tdsRate: formData.tdsRate || 0,
        notes: formData.notes,
        isActive: formData.isActive,
      };

      if (isEditing) {
        await api.put(`/api/recurring-invoices/${id}`, templateData);
        alert("Template updated successfully");
      } else {
        await api.post("/api/recurring-invoices", templateData);
        alert("Template created successfully");
      }
      navigate("/recurring-invoices");
    } catch (error) {
      console.error("Error saving template:", error);
      alert(error.response?.data?.error || "Failed to save template");
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
            onClick={() => navigate("/recurring-invoices")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recurring Invoices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing
              ? "Edit Recurring Template"
              : "Create Recurring Template"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing
              ? "Update recurring invoice template"
              : "Create a template for automatic invoice generation"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Template Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Monthly Retainer - ABC Corp"
                  value={formData.templateName}
                  onChange={(e) =>
                    setFormData({ ...formData, templateName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

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
            </div>
          </div>

          {/* Recurring Schedule */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Calendar className="w-5 h-5 inline mr-2" />
              Recurring Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.nextInvoiceDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextInvoiceDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> Invoice will be generated
                automatically on the "Next Invoice Date" and the date will be
                updated based on frequency. For example, if frequency is
                "Monthly" and next date is "1st Jan", the system will generate
                invoice on 1st Jan, then update next date to 1st Feb.
              </p>
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
                      Select from Product Catalog (optional)
                    </label>
                    <select
                      value=""
                      onChange={(e) =>
                        handleProductSelect(index, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Or enter manually below --</option>
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

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
                        <option value="HOUR">Hour</option>
                        <option value="DAY">Day</option>
                        <option value="MONTH">Month</option>
                        <option value="YEAR">Year</option>
                        <option value="SET">Set</option>
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

                    <div>
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

                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-gray-900">
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

          {/* Invoice Discount & TDS - NEW SECTION */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice-Level Deductions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Applied after item-level discounts
                </p>
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
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Additional Information
            </h2>
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

          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Template Summary
            </h2>
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium text-gray-900">
                  ₹
                  {totals.totalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="pt-2 border-t-2 border-blue-300 flex justify-between">
                <span className="font-semibold text-gray-900">
                  Total per Invoice:
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

          {/* Form Actions */}
          <div className="flex gap-3 justify-end bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => navigate("/recurring-invoices")}
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
                ? "Update Template"
                : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
