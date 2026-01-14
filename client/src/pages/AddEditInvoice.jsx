// ============================================
// FILE: client/src/pages/AddEditInvoice.jsx
// ============================================

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import HSNSearch from "../components/HSNSearch";
import Layout from "../components/Layout";
import api from "../utils/api";
import ItemScanner from "../components/ItemScanner";
import OCRDocumentScanner from "../components/OCRDocumentScanner";
import SmartCategorySuggestion from "../components/SmartCategorySuggestion";
import {
  ArrowLeft,
  Save,
  Plus,
  Minus,
  Package,
  Percent,
  AlertTriangle,
  CheckCircle,
  Upload, // ← ADD THIS
  X, // ← ADD THIS (if not already there)
  Paperclip, // ← ADD THIS
  Camera,
  Calendar,
} from "lucide-react";

// Number to words converter (client-side)
const convertTwoDigit = (n) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  const tenDigit = Math.floor(n / 10);
  const oneDigit = n % 10;
  return tens[tenDigit] + (oneDigit > 0 ? " " + ones[oneDigit] : "");
};

const numberToWords = (num) => {
  if (num === 0) return "Zero Rupees Only";
  if (num < 0) return "Minus " + numberToWords(Math.abs(num));

  num = Math.floor(num);

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let words = "";

  if (crore > 0) {
    if (crore > 99) {
      words += numberToWords(crore).replace(" Rupees Only", "") + " Crore ";
    } else {
      words += convertTwoDigit(crore) + " Crore ";
    }
  }

  if (lakh > 0) words += convertTwoDigit(lakh) + " Lakh ";
  if (thousand > 0) words += convertTwoDigit(thousand) + " Thousand ";
  if (hundred > 0) words += convertTwoDigit(hundred) + " Hundred ";
  if (remainder > 0) {
    if (words.length > 0) words += "and ";
    words += convertTwoDigit(remainder) + " ";
  }

  return words.trim() + " Rupees Only";
};

const amountToWords = (amount) => {
  amount = Math.round(amount * 100) / 100;
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = numberToWords(rupees);

  if (paise > 0) {
    words =
      words.replace(" Only", "") +
      " and " +
      convertTwoDigit(paise) +
      " Paise Only";
  }

  return words;
};

export default function AddEditInvoice({ invoiceType: propInvoiceType }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = !!id;

  const duplicateData = location.state?.duplicateFrom;
  const isDuplicate = location.state?.isDuplicate;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [tdsConfigs, setTdsConfigs] = useState([]);
  const [organization, setOrganization] = useState(null);

 
  const [duplicateCheckResult, setDuplicateCheckResult] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);


  const [gstCalculation, setGstCalculation] = useState(null);

 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [gstinEntries, setGstinEntries] = useState([]);
 
  const [showScanner, setShowScanner] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [showCategorySuggestion, setShowCategorySuggestion] = useState(false);
  const [currentItemForSuggestion, setCurrentItemForSuggestion] =
    useState(null);
 
  const [showOCR, setShowOCR] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    invoiceType: propInvoiceType || "TAX_INVOICE",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",

    
    poNumber: "",
    poDate: "",
    contractNumber: "",
    salesPersonName: "",

 
    paymentTerms: 30,

    items: [
      {
        productId: "",
        description: "",
        subDescription: "",
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

    tcsApplicable: false,
    tcsRate: 0,

   
    reverseCharge: false,

    notes: "",
    eInvoice: {
      enabled: false,
      irn: "",
      ackNo: "",
      ackDate: "",
      status: "NOT_GENERATED",
    },
    eWayBill: {
      enabled: false,
      ewbNumber: "",
      ewbDate: "",
      validUpto: "",
      transportMode: "ROAD",
      vehicleNumber: "",
      distance: 0,
      transporterName: "",
      status: "NOT_GENERATED",
    },
    template: "MODERN",
    selectedGstin: "",
    grnNumber: "",
    preparedBy: "",
    verifiedBy: "",
  });

  const fetchGSTINs = async () => {
    try {
      const response = await api.get("/api/organization/gstins");
      setGstinEntries(response.data.gstins || []);

      // Auto-select default GSTIN
      const defaultGstin = response.data.gstins?.find(
        (g) => g.isDefault && g.isActive
      );
      if (defaultGstin && !formData.selectedGstin) {
        setFormData((prev) => ({ ...prev, selectedGstin: defaultGstin._id }));
      }
    } catch (error) {
      console.error("Error fetching GSTINs:", error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchTDSConfigs();
    fetchOrganization();
    fetchGSTINs();

    if (isEditing) {
      fetchInvoice();
    } else if (isDuplicate && duplicateData) {
      setFormData({
        clientId: duplicateData.client?._id || "",
        invoiceType: duplicateData.invoiceType,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        paymentTerms: 30,
        poNumber: duplicateData.poNumber || "",
        poDate: duplicateData.poDate?.split("T")[0] || "",
        contractNumber: duplicateData.contractNumber || "",
        salesPersonName: duplicateData.salesPersonName || "",
        grnNumber: duplicateData.grnNumber || "",
        preparedBy: duplicateData.preparedBy || "",
        verifiedBy: duplicateData.verifiedBy || "",
        items:
          duplicateData.items?.map((item) => ({
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
        tdsAmount: 0,
        tcsApplicable: duplicateData.tcsApplicable || false,
        tcsRate: duplicateData.tcsRate || 0,
        reverseCharge: false,
        notes: duplicateData.notes || "",
        eInvoice: {
          enabled: false,
          irn: "",
          ackNo: "",
          ackDate: "",
          status: "NOT_GENERATED",
        },
        eWayBill: {
          enabled: false,
          ewbNumber: "",
          ewbDate: "",
          validUpto: "",
          transportMode: "ROAD",
          vehicleNumber: "",
          distance: 0,
          transporterName: "",
          status: "NOT_GENERATED",
        },
        template: duplicateData.template || "MODERN",
      });
    }
  }, [id, isDuplicate, duplicateData]);

 
  useEffect(() => {
    if (formData.invoiceDate && formData.paymentTerms) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + parseInt(formData.paymentTerms));
      setFormData((prev) => ({
        ...prev,
        dueDate: dueDate.toISOString().split("T")[0],
      }));
    }
  }, [formData.invoiceDate, formData.paymentTerms]);

  //  Calculate GST metadata when client or items change
  useEffect(() => {
    if (formData.clientId && formData.items.length > 0 && organization) {
      calculateGSTMeta();
    }
  }, [formData.clientId, formData.items, organization]);

  //  Set invoice type from prop
  useEffect(() => {
    if (propInvoiceType && !isEditing) {
      setFormData((prev) => ({
        ...prev,
        invoiceType: propInvoiceType,
      }));
    }
  }, [propInvoiceType, isEditing]);

  const fetchOrganization = async () => {
    try {
      const response = await api.get("/api/organization");
      setOrganization(response.data);
    } catch (error) {
      console.error("Error fetching organization:", error);
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
        paymentTerms: Math.ceil(
          (new Date(response.data.dueDate) -
            new Date(response.data.invoiceDate)) /
            (1000 * 60 * 60 * 24)
        ),
        poNumber: response.data.poNumber || "",
        poDate: response.data.poDate?.split("T")[0] || "",
        contractNumber: response.data.contractNumber || "",
        salesPersonName: response.data.salesPersonName || "",
        grnNumber: response.data.grnNumber || "",
        preparedBy: response.data.preparedBy || "",
        verifiedBy: response.data.verifiedBy || "",
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
        tcsApplicable: response.data.tcsApplicable || false,
        tcsRate: response.data.tcsRate || 0,
        reverseCharge: response.data.reverseCharge || false,
        notes: response.data.notes || "",
        eInvoice: response.data.eInvoice || {
          enabled: false,
          irn: "",
          ackNo: "",
          ackDate: "",
          status: "NOT_GENERATED",
        },
        eWayBill: response.data.eWayBill || {
          enabled: false,
          ewbNumber: "",
          ewbDate: "",
          validUpto: "",
          transportMode: "ROAD",
          vehicleNumber: "",
          distance: 0,
          transporterName: "",
          status: "NOT_GENERATED",
        },
        template: response.data.template || "MODERN",
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      alert("Failed to fetch invoice details");
      navigate("/invoices");
    }
  };

  // Calculate GST Metadata
  const calculateGSTMeta = async () => {
    try {
      const client = clients.find((c) => c._id === formData.clientId);
      if (!client || !organization) return;

      const clientStateCode = client.gstin?.substring(0, 2) || null;
      const orgStateCode = organization.gstin?.substring(0, 2) || null;

      if (!client.gstin) {
        setGstCalculation({
          transactionInfo: {
            type: "B2C",
            description: "Business to Consumer (Unregistered)",
            gstSplit: "CGST+SGST",
            orgState: organization.state || "N/A",
            clientState: "Unregistered",
          },
          isInterstate: false,
        });
      } else if (clientStateCode === orgStateCode) {
        setGstCalculation({
          transactionInfo: {
            type: "B2B_INTRASTATE",
            description: "Business to Business (Same State)",
            gstSplit: "CGST+SGST",
            orgState: organization.state || "N/A",
            clientState: client.billingState || "N/A",
          },
          isInterstate: false,
        });
      } else {
        setGstCalculation({
          transactionInfo: {
            type: "B2B_INTERSTATE",
            description: "Business to Business (Different State)",
            gstSplit: "IGST",
            orgState: organization.state || "N/A",
            clientState: client.billingState || "N/A",
          },
          isInterstate: true,
        });
      }
    } catch (error) {
      console.error("Error calculating GST meta:", error);
    }
  };

  //Check for Duplicate Invoice Number
  const checkDuplicateInvoiceNumber = async (invoiceNumber) => {
    if (!invoiceNumber || isEditing) return;

    setCheckingDuplicate(true);
    try {
      const response = await api.get("/api/invoices/check-duplicate", {
        params: { invoiceNumber },
      });
      setDuplicateCheckResult(response.data);
    } catch (error) {
      console.error("Error checking duplicate:", error);
    } finally {
      setCheckingDuplicate(false);
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

  const handleOCRDataExtracted = (extractedData) => {
    console.log("📄 OCR Data Received:", extractedData);

    if (!extractedData) {
      alert("❌ No data extracted. Please try again.");
      return;
    }

    // If OCR extracted multiple items, add all of them
    if (extractedData.items && extractedData.items.length > 0) {
      console.log(`📦 Processing ${extractedData.items.length} items from OCR`);

      // Replace first empty item with first OCR item
      const ocrItems = extractedData.items.map((item, idx) => {
        console.log(`Item ${idx + 1}:`, item.description, "HSN:", item.hsn);

        return {
          productId: "",
          description: item.description || "",
          hsnSacCode: item.hsn || "",
          quantity: item.quantity || 1,
          unit: item.unit || "PCS",
          rate: item.rate || 0,
          gstRate: extractedData.gstRate || 18,
          itemType: "PRODUCT",
          discountType: "PERCENTAGE",
          discountValue: 0,
          discountAmount: 0,
          taxableAmount: item.amount || item.quantity * item.rate || 0,
          amount: item.amount || item.quantity * item.rate || 0,
        };
      });

      setFormData((prev) => ({
        ...prev,
        // Replace the first item if it's empty
        items:
          prev.items[0].description === "" && prev.items.length === 1
            ? ocrItems
            : [...prev.items, ...ocrItems],
        // Also populate other invoice header fields
        vendorName: extractedData.vendorName || prev.vendorName,
        invoiceNumber: extractedData.invoiceNumber || prev.invoiceNumber,
        invoiceDate: extractedData.date || prev.invoiceDate,
        dueDate: extractedData.dueDate || prev.dueDate,
      }));

      console.log(`✅ Added ${ocrItems.length} items from OCR`);
      alert(`✅ Successfully added ${ocrItems.length} item(s) from OCR scan!`);
    } else {
      // Fallback: single item
      console.log("Single item mode");
      const newItem = {
        productId: "",
        description: extractedData.description || "Scanned Item",
        hsnSacCode: extractedData.hsn || "",
        quantity: 1,
        unit: "PCS",
        rate: extractedData.amount || 0,
        gstRate: extractedData.gstRate || 18,
        itemType: "PRODUCT",
        discountType: "PERCENTAGE",
        discountValue: 0,
        discountAmount: 0,
        taxableAmount: extractedData.amount || 0,
        amount: extractedData.amount || 0,
      };

      setFormData((prev) => ({
        ...prev,
        items:
          prev.items[0].description === "" && prev.items.length === 1
            ? [newItem]
            : [...prev.items, newItem],
      }));

      console.log("✅ Item added from OCR");
      alert("✅ Item added from OCR scan!");
    }

    // Close modal
    setShowOCR(false);
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

    // TCS Calculation
    const tcsAmount = formData.tcsApplicable
      ? (taxableAmount * formData.tcsRate) / 100
      : 0;

    const total = totalWithTax + tcsAmount - tdsAmount;

    return {
      itemsTotal,
      itemDiscounts,
      subtotal,
      invoiceDiscountAmount,
      taxableAmount,
      totalTax,
      totalWithTax,
      tdsAmount,
      tcsAmount,
      total,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (duplicateCheckResult?.exists && !isEditing) {
      alert("Invoice number already exists! Please change the invoice number.");
      return;
    }

    setLoading(true);

    try {
      const totals = calculateTotals();

      const invoiceData = {
        clientId: formData.clientId,
        invoiceType: formData.invoiceType,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        poNumber: formData.poNumber,
        poDate: formData.poDate || null,
        contractNumber: formData.contractNumber,
        salesPersonName: formData.salesPersonName,
        // ✅ FIX: Keep productId for stock validation
        items: formData.items.map((item) => ({
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gstRate: item.gstRate,
          itemType: item.itemType,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountAmount: item.discountAmount,
          taxableAmount: item.taxableAmount,
          amount: item.amount,
          // ✅ FIX: Only include productId if it's valid (not empty or "custom")
          ...(item.productId &&
          item.productId !== "" &&
          item.productId !== "custom"
            ? { productId: item.productId }
            : {}),
        })),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        tdsSection: formData.tdsSection || null,
        tdsRate: formData.tdsRate || 0,
        tdsAmount: totals.tdsAmount || 0,
        tcsApplicable: formData.tcsApplicable,
        tcsRate: formData.tcsRate || 0,
        reverseCharge: formData.reverseCharge,
        notes: formData.notes,
        eInvoice: formData.eInvoice,
        eWayBill: formData.eWayBill,
        template: formData.template,
        selectedGstin: formData.selectedGstin || null,
        grnNumber: formData.grnNumber, // ✅ Add if missing
        preparedBy: formData.preparedBy, // ✅ Add if missing
        verifiedBy: formData.verifiedBy,
      };

      console.log("Submitting invoice data:", invoiceData);

      if (isEditing) {
        await api.put(`/api/invoices/${id}`, invoiceData);

        if (selectedFiles.length > 0) {
          setUploadProgress(true);
          const fileFormData = new FormData();
          selectedFiles.forEach((file) => {
            fileFormData.append("files", file);
          });

          try {
            await api.post(`/api/invoices/${id}/attachments`, fileFormData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (uploadError) {
            console.error("Upload error:", uploadError);
            alert("Invoice saved but file upload failed");
          }
          setUploadProgress(false);
        }

        alert("Invoice updated successfully");
      } else {
        const response = await api.post("/api/invoices", invoiceData);
        const createdInvoiceId = response.data._id;

        if (selectedFiles.length > 0) {
          setUploadProgress(true);
          const fileFormData = new FormData();
          selectedFiles.forEach((file) => {
            fileFormData.append("files", file);
          });

          try {
            await api.post(
              `/api/invoices/${createdInvoiceId}/attachments`,
              fileFormData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              }
            );
          } catch (uploadError) {
            console.error("Upload error:", uploadError);
            alert("Invoice created but file upload failed");
          }
          setUploadProgress(false);
        }

        alert(
          isDuplicate
            ? "Duplicate invoice created successfully"
            : "Invoice created successfully"
        );
      }
      navigate("/invoices");
    } catch (error) {
      console.error("Error saving invoice:", error);
      console.error("Error details:", error.response?.data);

      // ✅ Better error handling
      if (error.response?.status === 400) {
        const errorData = error.response.data;

        if (errorData.error === "Insufficient stock") {
          let alertMessage = "⚠️ INSUFFICIENT STOCK\n\n";

          if (errorData.stockErrors && Array.isArray(errorData.stockErrors)) {
            errorData.stockErrors.forEach((stockError) => {
              alertMessage += `📦 ${stockError.product}\n`;
              alertMessage += `   Requested: ${stockError.requested} ${stockError.unit}\n`;
              alertMessage += `   Available: ${stockError.available} ${stockError.unit}\n\n`;
            });
          } else if (errorData.details) {
            alertMessage += errorData.details + "\n\n";
          }

          alertMessage +=
            "Please reduce the quantity or choose different items.";
          alert(alertMessage);
        } else {
          alert(errorData.error || "Validation failed");
        }
      } else {
        alert(error.response?.data?.error || "Failed to save invoice");
      }
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  // File Upload Handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getInvoiceTypeName = (type) => {
    const types = {
      TAX_INVOICE: "Tax Invoice",
      PROFORMA: "Pro-Forma Invoice",
      CREDIT_NOTE: "Credit Note",
      DEBIT_NOTE: "Debit Note",
      DELIVERY_CHALLAN: "Delivery Challan",
    };
    return types[type] || type;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing
              ? "Edit Invoice"
              : isDuplicate
              ? "Duplicate Invoice"
              : "Create New Invoice"}
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

              {/* Branch Selection */}
              {formData.clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Location
                    {clients.find((c) => c._id === formData.clientId)?.branches
                      ?.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        (
                        {
                          clients
                            .find((c) => c._id === formData.clientId)
                            .branches.filter((b) => b.isActive).length
                        }{" "}
                        branches available)
                      </span>
                    )}
                  </label>

                  {/* Check if client has branches */}
                  {clients.find((c) => c._id === formData.clientId)?.branches
                    ?.length > 0 ? (
                    // Client HAS branches - show dropdown
                    <select
                      value={formData.selectedBranch || ""}
                      onChange={(e) => {
                        const selectedClient = clients.find(
                          (c) => c._id === formData.clientId
                        );
                        const branch = selectedClient?.branches.find(
                          (b) => b._id === e.target.value
                        );

                        if (branch) {
                          setFormData({
                            ...formData,
                            selectedBranch: e.target.value,
                            billingAddress: branch.address,
                            billingCity: branch.city,
                            billingState: branch.state,
                            billingPincode: branch.pincode,
                          });
                        } else {
                          // Clear branch selection - use default client address
                          setFormData({
                            ...formData,
                            selectedBranch: "",
                            billingAddress: selectedClient?.billingAddress,
                            billingCity: selectedClient?.billingCity,
                            billingState: selectedClient?.billingState,
                            billingPincode: selectedClient?.billingPincode,
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">
                        Select Branch (or use default address)
                      </option>
                      {clients
                        .find((c) => c._id === formData.clientId)
                        .branches.filter((b) => b.isActive)
                        .map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.branchName} - {branch.city}
                            {branch.isDefault && " (Default)"}
                          </option>
                        ))}
                    </select>
                  ) : (
                    // Client DOES NOT have branches - show info message
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value="No branches configured"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Helper text */}
                  {clients.find((c) => c._id === formData.clientId)?.branches
                    ?.length > 0 ? (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Select a branch to use its address, or leave blank to
                      use default client address
                    </p>
                  ) : (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ This client has no branches configured. Using default
                      address.
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `/clients/edit/${formData.clientId}`,
                            "_blank"
                          )
                        }
                        className="underline ml-1 hover:text-orange-800"
                      >
                        Add branches →
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/*  Hide invoice type dropdown when coming from Sales menu */}
              {!propInvoiceType && (
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
                    <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                  </select>
                </div>
              )}

              {/* Show invoice type as read-only when coming from specific route */}
              {propInvoiceType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Type
                  </label>
                  <input
                    type="text"
                    value={getInvoiceTypeName(formData.invoiceType)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 text-blue-900 font-medium"
                  />
                </div>
              )}

              {gstinEntries.length > 1 && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing GSTIN <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.selectedGstin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selectedGstin: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Billing GSTIN</option>
                    {gstinEntries
                      .filter((g) => g.isActive)
                      .map((gstin) => (
                        <option key={gstin._id} value={gstin._id}>
                          {gstin.stateName} - {gstin.gstin}
                          {gstin.isDefault && " (Default)"}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the GSTIN for this invoice's billing location
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceDate: e.target.value })
                    }
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-400 transition-colors"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {/* Payment Terms Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentTerms: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="0">Immediate</option>
                  <option value="7">Net 7 Days</option>
                  <option value="15">Net 15 Days</option>
                  <option value="30">Net 30 Days</option>
                  <option value="45">Net 45 Days</option>
                  <option value="60">Net 60 Days</option>
                  <option value="90">Net 90 Days</option>
                </select>
              </div>

              {/* Due Date (Auto-calculated) */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                />
                <p className="text-xs text-blue-600 mt-1">
                  Auto-calculated from Payment Terms
                </p>
              </div>

              {/* Additional Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={formData.poNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, poNumber: e.target.value })
                  }
                  placeholder="Purchase Order Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Date
                </label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) =>
                    setFormData({ ...formData, poDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Number
                </label>
                <input
                  type="text"
                  value={formData.contractNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, contractNumber: e.target.value })
                  }
                  placeholder="Contract Reference Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Person Name
                </label>
                <input
                  type="text"
                  value={formData.salesPersonName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salesPersonName: e.target.value,
                    })
                  }
                  placeholder="Sales Representative"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* ✅ NEW: GRN/Delivery Challan Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GRN / Delivery Challan No.
                </label>
                <input
                  type="text"
                  value={formData.grnNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, grnNumber: e.target.value })
                  }
                  placeholder="GRN-001 or DC-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Reference number for goods receipt or delivery
                </p>
              </div>
            </div>
          </div>

          {/* Reverse Charge &  TCS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Special Tax Provisions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reverse Charge */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <input
                    type="checkbox"
                    id="reverseCharge"
                    checked={formData.reverseCharge || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reverseCharge: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-orange-600"
                  />
                  <label htmlFor="reverseCharge" className="flex-1">
                    <p className="text-sm font-medium text-orange-900">
                      ⚠️ Reverse Charge Applicable
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Tax is payable by the recipient under Section 9(3) of CGST
                      Act. This will be shown on the invoice PDF.
                    </p>
                  </label>
                </div>
              </div>

              {/* TCS Checkbox */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    id="tcsApplicable"
                    checked={formData.tcsApplicable || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tcsApplicable: e.target.checked,
                        tcsRate: e.target.checked ? 0.1 : 0,
                      })
                    }
                    className="w-5 h-5 text-purple-600"
                  />
                  <label htmlFor="tcsApplicable" className="flex-1">
                    <p className="text-sm font-medium text-purple-900">
                      TCS (Tax Collected at Source) Applicable
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Section 206C(1H) - Applicable on sale of goods &gt; ₹50
                      lakh per annum
                    </p>
                  </label>
                </div>
              </div>

              {/* TCS Rate Input */}
              {formData.tcsApplicable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TCS Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.tcsRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tcsRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-purple-600 mt-1">
                    TCS Amount: ₹
                    {totals.tcsAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/*  CGST/SGST Visual Indicator */}
          {gstCalculation && formData.clientId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  GST Calculation Method
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 mb-1">Transaction Type:</p>
                    <p className="font-semibold text-blue-900">
                      {gstCalculation.transactionInfo?.description ||
                        "Calculating..."}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">GST Split:</p>
                    <p className="font-semibold text-blue-900">
                      {gstCalculation.transactionInfo?.gstSplit || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    {gstCalculation.isInterstate ? (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-100 px-3 py-2 rounded">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">
                          Interstate supply - IGST applicable
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-2 rounded">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                          Intrastate supply - CGST + SGST applicable
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">Your State:</p>
                    <p className="font-semibold">
                      {gstCalculation.transactionInfo?.orgState || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 mb-1">Client State:</p>
                    <p className="font-semibold">
                      {gstCalculation.transactionInfo?.clientState || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Line Items
              </h2>
              {/* ← ADD THIS: A container with TWO buttons */}
              <div className="flex gap-3">
                {/* ← NEW BUTTON: Scan Bill */}
                <button
                  type="button"
                  onClick={() => setShowOCR(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  📄 Scan Bill
                </button>

                {/* ← EXISTING BUTTON: Add Item (now in the container) */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-blue-900">
                        <Package className="w-4 h-4 inline mr-1" />
                        Select from Item Catalog (or choose Custom Item)
                      </label>

                      {/* ✅ SCAN BARCODE BUTTON */}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentItemIndex(index);
                          setShowScanner(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Scan Barcode
                      </button>
                    </div>

                    <select
                      value={item.productId}
                      onChange={(e) =>
                        handleProductSelect(index, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">-- Select Item --</option>
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

                  <div className="space-y-4">
                    {/* Row 1: Description & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sub-Description (Optional)
                        </label>
                        <textarea
                          value={item.subDescription || ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "subDescription",
                              e.target.value
                            )
                          }
                          placeholder="Additional details (e.g., Model: Dell Inspiron 15, Specs: 16GB RAM)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows="2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type *
                        </label>
                        <select
                          required
                          value={item.itemType}
                          onChange={(e) =>
                            handleItemChange(index, "itemType", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PRODUCT">Product</option>
                          <option value="SERVICE">Service</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: HSN/SAC (Full Width, Prominent) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HSN/SAC Code *
                      </label>

                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                        {/* Enhanced HSN Search Component */}
                        <HSNSearch
                          value={item.hsnSacCode}
                          onChange={(code) =>
                            handleItemChange(index, "hsnSacCode", code)
                          }
                          itemType={item.itemType}
                          onSelect={(hsn) => {
                            handleItemChange(index, "hsnSacCode", hsn.code);
                            if (hsn.defaultGstRate) {
                              handleItemChange(
                                index,
                                "gstRate",
                                hsn.defaultGstRate
                              );
                            }
                            try {
                              api.post(`/api/hsn/${hsn.code}/increment-usage`);
                            } catch (error) {
                              console.log("Usage tracking failed");
                            }
                          }}
                          required={true}
                          placeholder={
                            organization?.annualTurnover <= 50000000
                              ? "Search or enter HSN/SAC (4 digits)"
                              : "Search or enter HSN/SAC (6+ digits)"
                          }
                        />

                        {/* Validation Hint */}
                        <div className="flex items-start gap-2 text-xs">
                          <div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                            ℹ
                          </div>
                          <div className="text-blue-700">
                            {organization?.annualTurnover <= 50000000 ? (
                              <p>
                                <strong>4 digits required</strong> (Turnover ≤
                                ₹5 crore)
                                <br />
                                Example: 8471, 9983
                              </p>
                            ) : (
                              <p>
                                <strong>6+ digits required</strong> (Turnover
                                &gt; ₹5 crore)
                                <br />
                                Example: 847130, 998314
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Quantity, Unit, Rate, GST */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit *
                        </label>
                        <select
                          required
                          value={item.unit}
                          onChange={(e) =>
                            handleItemChange(index, "unit", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
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

            {/* ✅ NEW: Prepared By / Verified By Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Document Authorization
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={formData.preparedBy || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, preparedBy: e.target.value })
                    }
                    placeholder="Name of person who prepared this invoice"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verified By
                  </label>
                  <input
                    type="text"
                    value={formData.verifiedBy || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, verifiedBy: e.target.value })
                    }
                    placeholder="Name of person who verified this invoice"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 These names will appear on the PDF invoice for internal
                tracking
              </p>
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
            {/*Smart Category Suggestion */}
            {formData.notes && formData.clientId && (
              <div className="mt-4">
                <SmartCategorySuggestion
                  description={formData.notes}
                  clientId={formData.clientId}
                  vendorName={
                    clients.find((c) => c._id === formData.clientId)
                      ?.companyName
                  }
                  amount={totals.total}
                  items={formData.items}
                  onSuggestionAccept={(suggestion) => {
                    // Auto-fill notes with category tag
                    setFormData((prev) => ({
                      ...prev,
                      notes: `[${suggestion.category}] ${prev.notes}`,
                    }));

                    // Apply suggested TDS if applicable
                    if (suggestion.taxCode?.tdsSection) {
                      handleTDSChange(suggestion.taxCode.tdsSection);
                    }
                  }}
                  onSuggestionReject={() => {
                    // Optional: Handle rejection
                    console.log("User rejected AI suggestion");
                  }}
                />
              </div>
            )}
          </div>

          {/* Attachments Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Paperclip className="w-5 h-5 inline mr-2" />
              Attachments (Optional)
            </h2>

            <div className="space-y-4">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Images, Documents (max 10MB each)
                  </p>
                </label>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Files ({selectedFiles.length})
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Attachments (when editing) */}
              {isEditing && invoice?.attachments?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Existing Attachments ({invoice.attachments.length})
                  </p>
                  {invoice.attachments.map((attachment) => (
                    <div
                      key={attachment._id}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900 flex-1">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-blue-600">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 italic">
                    View and manage attachments in invoice detail page
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* E-Invoice Section */}
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
                      eInvoice: {
                        ...formData.eInvoice,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <label
                  htmlFor="eInvoiceEnabled"
                  className="text-sm font-semibold text-blue-900"
                >
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
                      value={formData.eInvoice?.irn || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: {
                            ...formData.eInvoice,
                            irn: e.target.value,
                          },
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
                      value={formData.eInvoice?.ackNo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: {
                            ...formData.eInvoice,
                            ackNo: e.target.value,
                          },
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
                      value={formData.eInvoice?.ackDate?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: {
                            ...formData.eInvoice,
                            ackDate: e.target.value,
                          },
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
                      value={formData.eInvoice?.status || "NOT_GENERATED"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eInvoice: {
                            ...formData.eInvoice,
                            status: e.target.value,
                          },
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
                💡 Manual mode: Enter details from GST Portal. API integration
                coming soon.
              </p>
            </div>
          </div>

          {/* E-Way Bill Section */}
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
                      eWayBill: {
                        ...formData.eWayBill,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-green-600"
                />
                <label
                  htmlFor="eWayBillEnabled"
                  className="text-sm font-semibold text-green-900"
                >
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
                      value={formData.eWayBill?.ewbNumber || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            ewbNumber: e.target.value,
                          },
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
                      value={formData.eWayBill?.ewbDate?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            ewbDate: e.target.value,
                          },
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
                      value={formData.eWayBill?.validUpto?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            validUpto: e.target.value,
                          },
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
                      value={formData.eWayBill?.transportMode || "ROAD"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            transportMode: e.target.value,
                          },
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
                      value={formData.eWayBill?.vehicleNumber || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            vehicleNumber: e.target.value.toUpperCase(),
                          },
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
                      value={formData.eWayBill?.distance || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            distance: parseFloat(e.target.value) || 0,
                          },
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
                      value={formData.eWayBill?.transporterName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            transporterName: e.target.value,
                          },
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
                      value={formData.eWayBill?.status || "NOT_GENERATED"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eWayBill: {
                            ...formData.eWayBill,
                            status: e.target.value,
                          },
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
                💡 Manual mode: Enter details from E-Way Bill Portal. API
                integration coming soon.
              </p>
            </div>
          </div>

          {/* Invoice Summary */}
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
                {totals.tcsAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-600">
                      TCS ({formData.tcsRate}%):
                    </span>
                    <span className="font-medium text-purple-600">
                      +₹
                      {totals.tcsAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Total (with GST & TCS):</span>
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

            {/* Amount in Words */}
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
              disabled={loading || (duplicateCheckResult?.exists && !isEditing)}
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
          {/* OCR DOCUMENT SCANNER MODAL */}
          {showOCR && (
            <OCRDocumentScanner
              onDataExtracted={handleOCRDataExtracted}
              onClose={() => setShowOCR(false)}
            />
          )}
        </form>
        {/* BARCODE SCANNER MODAL */}
        {showScanner && currentItemIndex !== null && (
          <ItemScanner
            onItemScanned={(product) => {
              // Auto-fill item with scanned product
              const newItems = [...formData.items];
              const quantity = newItems[currentItemIndex].quantity || 1;
              const rate = product.rate;
              const baseAmount = quantity * rate;

              newItems[currentItemIndex] = {
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

              setFormData({ ...formData, items: newItems });
              setShowScanner(false);
              setCurrentItemIndex(null);
            }}
            onClose={() => {
              setShowScanner(false);
              setCurrentItemIndex(null);
            }}
          />
        )}

        {/* Form Actions */}
      </div>
    </Layout>
  );
}
