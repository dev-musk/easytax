// ============================================
// FILE: server/utils/pdfGenerator.js
// ✅ FINAL FIX: Always show GRN/DC field + Prepared/Verified sections
// ============================================

import QRCode from 'qrcode';

export const generateInvoicePDF = async (invoice, organization) => {

  // Template settings with defaults
  const templateSettings = invoice.templateSettings || {
    fontFamily: "Roboto",
    headerStyle: "BOXED",
    borderStyle: "PARTIAL",
    themeColor: "BLUE",
    textAlignment: "LEFT",
  };

  // Theme color mapping
  const themeColors = {
    BLUE: { primary: "#2563eb", light: "#dbeafe", dark: "#1e40af" },
    PURPLE: { primary: "#9333ea", light: "#f3e8ff", dark: "#7e22ce" },
    GREEN: { primary: "#16a34a", light: "#dcfce7", dark: "#15803d" },
    ORANGE: { primary: "#ea580c", light: "#ffedd5", dark: "#c2410c" },
    RED: { primary: "#dc2626", light: "#fee2e2", dark: "#b91c1c" },
    INDIGO: { primary: "#4f46e5", light: "#e0e7ff", dark: "#4338ca" },
  };

  const currentTheme =
    themeColors[templateSettings.themeColor] || themeColors.BLUE;

  // ✅ Generate UPI QR Code if UPI ID exists
  let upiQrCodeDataUrl = null;
  
  if (organization?.bankDetails?.upiId && invoice.balanceAmount > 0) {
    try {
      // Create UPI payment string
      const upiString = `upi://pay?pa=${organization.bankDetails.upiId}&pn=${encodeURIComponent(
        organization.name
      )}&am=${invoice.balanceAmount || invoice.totalAmount}&cu=INR&tn=${encodeURIComponent(
        `Payment for Invoice ${invoice.invoiceNumber}`
      )}`;

      // Generate QR code as base64 data URL
      upiQrCodeDataUrl = await QRCode.toDataURL(upiString, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      console.log('✅ UPI QR Code generated for PDF');
    } catch (error) {
      console.error('❌ Error generating UPI QR code:', error);
      // Continue without QR code if generation fails
    }
  }

  
  // Date format with hyphens and short year (13-Jan-26)
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate CGST/SGST rate
  const calculateGSTRate = () => {
    if (invoice.cgst > 0 && invoice.subtotal > 0) {
      const taxableAmount = invoice.subtotal - (invoice.discountAmount || 0);
      const cgstRate = ((invoice.cgst / taxableAmount) * 100).toFixed(2);
      const sgstRate = ((invoice.sgst / taxableAmount) * 100).toFixed(2);
      return { cgst: cgstRate, sgst: sgstRate };
    } else if (invoice.igst > 0 && invoice.subtotal > 0) {
      const taxableAmount = invoice.subtotal - (invoice.discountAmount || 0);
      const igstRate = ((invoice.igst / taxableAmount) * 100).toFixed(2);
      return { igst: igstRate };
    }
    return {};
  };

  const gstRates = calculateGSTRate();

  const isInterstate = invoice.igst > 0;
  const showLogo =
    organization?.logo &&
    organization?.displaySettings?.showCompanyLogo !== false;
  const showBankDetails =
    organization?.bankDetails &&
    organization?.displaySettings?.showBankDetails !== false;
  const showSignature =
    organization?.authorizedSignatory &&
    organization?.displaySettings?.showAuthorizedSignature !== false;
  const showAmountInWords =
    organization?.displaySettings?.amountInWords !== false &&
    invoice.amountInWords;

  // ✅ FIX: Always show Additional Info if ANY field exists (including conditional fields)
  const hasAdditionalInfo =
    invoice.poNumber ||
    invoice.poDate ||
    invoice.contractNumber ||
    invoice.salesPersonName ||
    invoice.grnNumber ||
    invoice.preparedBy ||
    invoice.verifiedBy ||
    true; // Always show section

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: '${
        templateSettings.fontFamily
      }', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #333;
      padding: 15mm;
      background: white;
    }

    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      ${
        templateSettings.borderStyle === "FULL" ? "border: 2px solid #ccc;" : ""
      }
      ${
        templateSettings.borderStyle === "PARTIAL"
          ? "border-top: 2px solid #ccc; border-bottom: 2px solid #ccc;"
          : ""
      }
      padding: 15px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      ${
        templateSettings.headerStyle === "BOXED"
          ? `
        background: ${currentTheme.light};
        border: 2px solid ${currentTheme.primary};
        border-radius: 6px;
        padding: 15px;
      `
          : `
        padding-bottom: 15px;
        border-bottom: 3px solid ${currentTheme.primary};
      `
      }
    }

    .company-logo {
      max-height: 70px;
      max-width: 180px;
      object-fit: contain;
      margin-bottom: 10px;
    }

    .company-details h1 {
      font-size: 20px;
      color: ${currentTheme.primary};
      margin-bottom: 8px;
      text-align: ${templateSettings.textAlignment.toLowerCase()};
    }

    .company-details p {
      margin: 2px 0;
      font-size: 9px;
      color: #666;
      line-height: 1.4;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      font-size: 24px;
      color: ${currentTheme.primary};
      margin-bottom: 8px;
    }

    .invoice-title .invoice-number {
      font-size: 12px;
      font-weight: bold;
      color: #333;
    }

    .invoice-title .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: bold;
      margin-top: 6px;
    }

    .status-paid { background-color: #dcfce7; color: #166534; }
    .status-pending { background-color: #fef3c7; color: #92400e; }
    .status-overdue { background-color: #fee2e2; color: #991b1b; }
    .status-partially-paid { background-color: #dbeafe; color: #1e40af; }
    .status-draft { background-color: #f3f4f6; color: #374151; }

    .parties-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .party-box {
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 6px;
      background: #f9fafb;
    }

    .party-box h3 {
      font-size: 9px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .party-box .company-name {
      font-size: 13px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }

    .party-box p {
      font-size: 9px;
      color: #4b5563;
      margin: 2px 0;
      line-height: 1.4;
    }

    .dates-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
    }

    .date-item h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .date-item p {
      font-size: 11px;
      font-weight: 600;
      color: #1f2937;
    }

    .additional-info-section {
      margin-bottom: 15px;
      padding: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }

    .additional-info-section h3 {
      font-size: 9px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .info-item p:first-child {
      font-size: 8px;
      color: #6b7280;
      margin-bottom: 3px;
    }

    .info-item p:last-child {
      font-size: 10px;
      font-weight: 600;
      color: #1f2937;
    }

    /* ✅ NEW: Style for empty fields */
    .info-item .empty-field {
      color: #9ca3af;
      font-style: italic;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .items-table thead {
      background: #f3f4f6;
    }

    .items-table th {
      padding: 8px 6px;
      text-align: left;
      font-size: 8px;
      text-transform: uppercase;
      color: #374151;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table th.text-center { text-align: center; }
    .items-table th.text-right { text-align: right; }

    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table td {
      padding: 8px 6px;
      font-size: 9px;
      color: #1f2937;
      line-height: 1.4;
    }

    .items-table td.text-center { text-align: center; }
    .items-table td.text-right { text-align: right; }

    .items-table .item-description {
      font-weight: 600;
      color: #111827;
      font-size: 10px;
    }

    .items-table .item-sub-description {
      font-size: 8px;
      color: #666;
      font-style: italic;
      margin-top: 3px;
      line-height: 1.3;
    }

    .qty-unit {
      font-weight: 600;
      color: #1f2937;
    }

    .qty-unit .unit {
      color: #6b7280;
      font-size: 8px;
      text-transform: uppercase;
      margin-left: 2px;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .totals-box {
      width: 380px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .totals-row:last-child { border-bottom: none; }

    .totals-row .label {
      font-size: 9px;
      color: #6b7280;
    }

    .totals-row .value {
      font-size: 9px;
      font-weight: 600;
      color: #1f2937;
    }

    .totals-row.subtotal { background: #f9fafb; }

    .totals-row.total {
      background: ${currentTheme.primary};
      color: white;
      font-size: 11px;
      padding: 10px 12px;
    }

    .totals-row.total .label,
    .totals-row.total .value {
      color: white;
      font-weight: bold;
    }

    .totals-row.discount .value { color: #dc2626; }
    .totals-row.paid .value { color: #16a34a; }

    .totals-row.balance {
      background: #fee2e2;
    }

    .totals-row.balance .label,
    .totals-row.balance .value {
      color: #991b1b;
      font-weight: bold;
    }
    
    /* ✅ QR Code Section Styles */
    .qr-payment-section {
      margin-top: 20px;
      margin-bottom: 30px;
      padding: 20px 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qr-payment-section h3 {
      color: white;
      font-size: 14px;
      margin-bottom: 15px;
      font-weight: 600;
      text-align: center;
    }

    .qr-container {
      background: white;
      padding: 15px;
      border-radius: 6px;
      display: inline-block;
    }

    .qr-code-image {
      width: 200px;
      height: 200px;
      display: block;
      margin: 0 auto;
    }

    .qr-instructions {
      color: white;
      font-size: 11px;
      margin: 12px auto 0 auto;
      line-height: 1.6;
      text-align: center;
      max-width: 400px;
    }

    .qr-amount {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 16px;
      font-weight: bold;
      display: inline-block;
      text-align: center;
      margin-top: 10px;
    }

    .qr-upi-id {
      color: rgba(255, 255, 255, 0.9);
      font-size: 9px;
      margin-top: 10px;
      font-family: monospace;
      text-align: center;
    }

    @media print {
      .qr-payment-section {
        page-break-inside: avoid;
      }
    }
    .gst-filing-status {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #dcfce7;
      border-left: 3px solid #16a34a;
      border-radius: 4px;
    }

    .gst-filing-status h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #166534;
      margin-bottom: 6px;
      font-weight: 600;
    }

    .filing-indicators {
      display: flex;
      gap: 20px;
      font-size: 9px;
    }

    .filing-indicators .filed {
      color: #15803d;
      font-weight: 600;
    }

    .filing-indicators .pending {
      color: #92400e;
      font-weight: 600;
    }

    .amount-in-words {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #dbeafe;
      border-left: 3px solid #2563eb;
      border-radius: 4px;
    }

    .amount-in-words h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #1e40af;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .amount-in-words p {
      font-size: 10px;
      color: #1e3a8a;
      font-weight: 600;
    }

    .reverse-charge-notice {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #ffedd5;
      border-left: 3px solid #ea580c;
      border-radius: 4px;
    }

    .reverse-charge-notice p {
      font-size: 9px;
      color: #9a3412;
    }

    .reverse-charge-notice p:first-child {
      font-weight: bold;
      margin-bottom: 3px;
    }

    .notes-section {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }

    .notes-section h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #92400e;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .notes-section p {
      font-size: 9px;
      color: #78350f;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .terms-section {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #f9fafb;
      border-radius: 4px;
    }

    .terms-section h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #4b5563;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .terms-section p {
      font-size: 8px;
      color: #6b7280;
      line-height: 1.6;
    }

    .bank-details {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 4px;
    }

    .bank-details h4 {
      font-size: 8px;
      text-transform: uppercase;
      color: #166534;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .bank-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .bank-detail-item {
      font-size: 8px;
    }

    .bank-detail-item .label {
      color: #15803d;
      font-weight: 500;
    }

    .bank-detail-item .value {
      color: #14532d;
      font-weight: 600;
      margin-left: 4px;
    }

    .authorization-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #f3f4f6;
      border-radius: 4px;
    }

    .authorization-item h5 {
      font-size: 8px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .authorization-item p {
      font-size: 10px;
      font-weight: 600;
      color: #1f2937;
    }

    .footer {
      text-align: center;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      margin-top: 15px;
    }

    .footer p {
      font-size: 8px;
      color: #9ca3af;
      line-height: 1.5;
    }

    .signature-section {
      margin-top: 20px;
      text-align: right;
      padding-right: 20px;
    }

    .signature-image {
      max-height: 50px;
      max-width: 140px;
      object-fit: contain;
      margin-bottom: 8px;
    }

    .signature-line {
      display: inline-block;
      width: 180px;
      border-top: 2px solid #333;
      padding-top: 8px;
      margin-top: 40px;
    }

    .signature-text {
      font-size: 9px;
      color: #6b7280;
    }

    .signature-name {
      font-size: 11px;
      font-weight: 600;
      color: #1f2937;
      margin-top: 4px;
    }

    .signature-designation {
      font-size: 8px;
      color: #6b7280;
    }

    @media print {
      body {
        padding: 0;
      }

      .invoice-container {
        border: none;
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }

    @page {
      size: A4;
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-details">
        ${
          showLogo
            ? `<img src="${process.env.BASE_URL || "http://localhost:5000"}/${
                organization.logo
              }" alt="Company Logo" class="company-logo" />`
            : ""
        }
        
        <h1>${organization.name || "Your Company"}</h1>
        ${organization.address ? `<p>${organization.address}</p>` : ""}
        ${
          organization.city && organization.state
            ? `<p>${organization.city}, ${organization.state} - ${
                organization.pincode || ""
              }</p>`
            : ""
        }
        ${
          organization.gstin
            ? `<p><strong>GSTIN:</strong> ${organization.gstin}</p>`
            : ""
        }
        ${
          organization.pan
            ? `<p><strong>PAN:</strong> ${organization.pan}</p>`
            : ""
        }
        ${
          organization.cin
            ? `<p><strong>CIN:</strong> ${organization.cin}</p>`
            : ""
        }
        ${
          organization.email
            ? `<p><strong>Email:</strong> ${organization.email}</p>`
            : ""
        }
        ${
          organization.phone
            ? `<p><strong>Phone:</strong> ${organization.phone}</p>`
            : ""
        }
      </div>
      <div class="invoice-title">
        <h2>${
          invoice.invoiceType === "PROFORMA"
            ? "PROFORMA INVOICE"
            : "TAX INVOICE"
        }</h2>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <span class="status-badge status-${invoice.status
          .toLowerCase()
          .replace("_", "-")}">
          ${invoice.status.replace("_", " ")}
        </span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties-section">
      <div class="party-box">
        <h3>Bill To</h3>
        <div class="company-name">${
          invoice.client?.companyName || "Client Name"
        }</div>
        ${
          invoice.client?.billingAddress
            ? `<p>${invoice.client.billingAddress}</p>`
            : ""
        }
        ${
          invoice.client?.billingCity && invoice.client?.billingState
            ? `<p>${invoice.client.billingCity}, ${invoice.client.billingState}</p>`
            : ""
        }
        ${
          invoice.client?.gstin
            ? `<p><strong>GSTIN:</strong> ${invoice.client.gstin}</p>`
            : ""
        }
        ${
          invoice.client?.email
            ? `<p><strong>Email:</strong> ${invoice.client.email}</p>`
            : ""
        }
        ${
          invoice.client?.phone
            ? `<p><strong>Phone:</strong> ${invoice.client.phone}</p>`
            : ""
        }
      </div>
      
      ${
        invoice.client?.shippingAddress
          ? `
      <div class="party-box">
        <h3>Ship To</h3>
        <div class="company-name">${invoice.client?.companyName || ""}</div>
        <p>${invoice.client?.shippingAddress || ""}</p>
        ${
          invoice.client?.shippingCity && invoice.client?.shippingState
            ? `<p>${invoice.client.shippingCity}, ${invoice.client.shippingState}</p>`
            : ""
        }
        ${
          invoice.client?.shippingEmail
            ? `<p><strong>Email:</strong> ${invoice.client.shippingEmail}</p>`
            : ""
        }
        ${
          invoice.client?.shippingPhone
            ? `<p><strong>Phone:</strong> ${invoice.client.shippingPhone}</p>`
            : ""
        }
      </div>
      `
          : `<div></div>`
      }
    </div>

    <!-- Dates -->
    <div class="dates-section">
      <div class="date-item">
        <h4>Invoice Date</h4>
        <p>${formatDate(invoice.invoiceDate)}</p>
      </div>
      <div class="date-item">
        <h4>Due Date</h4>
        <p>${formatDate(invoice.dueDate)}</p>
      </div>
      <div class="date-item">
        <h4>Payment Terms</h4>
        <p>${Math.ceil(
          (new Date(invoice.dueDate) - new Date(invoice.invoiceDate)) /
            (1000 * 60 * 60 * 24)
        )} Days</p>
      </div>
    </div>

    <!-- ✅ FIX: ALWAYS show Additional Information section with ALL fields (including empty ones) -->
    ${
      hasAdditionalInfo
        ? `
    <div class="additional-info-section">
      <h3>Additional Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <p>PO Number</p>
          <p${!invoice.poNumber ? ' class="empty-field"' : ""}>${
            invoice.poNumber || "___"
          }</p>
        </div>
        <div class="info-item">
          <p>PO Date</p>
          <p${!invoice.poDate ? ' class="empty-field"' : ""}>${
            invoice.poDate ? formatDate(invoice.poDate) : "___"
          }</p>
        </div>
        <div class="info-item">
          <p>GRN/DC Number</p>
          <p${!invoice.grnNumber ? ' class="empty-field"' : ""}>${
            invoice.grnNumber || "___"
          }</p>
        </div>
        <div class="info-item">
          <p>Contract Number</p>
          <p${!invoice.contractNumber ? ' class="empty-field"' : ""}>${
            invoice.contractNumber || "___"
          }</p>
        </div>
        <div class="info-item">
          <p>Sales Person</p>
          <p${!invoice.salesPersonName ? ' class="empty-field"' : ""}>${
            invoice.salesPersonName || "___"
          }</p>
        </div>
      </div>
    </div>
    `
        : ""
    }

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 35%;">Description</th>
          <th class="text-center" style="width: 10%;">HSN/SAC</th>
          <th class="text-center" style="width: 12%;">Qty & Unit</th>
          <th class="text-right" style="width: 12%;">Rate</th>
          <th class="text-center" style="width: 7%;">GST%</th>
          <th class="text-right" style="width: 10%;">Tax Amt</th>
          <th class="text-right" style="width: 10%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          ?.map(
            (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="item-description">${item.description}</div>
              ${
                item.subDescription
                  ? `<div class="item-sub-description">${item.subDescription}</div>`
                  : ""
              }
            </td>
            <td class="text-center">${item.hsnSacCode || "-"}</td>
            <td class="text-center">
              <span class="qty-unit">
                ${item.quantity}<span class="unit">${item.unit}</span>
              </span>
            </td>
            <td class="text-right">${formatCurrency(item.rate)}</td>
            <td class="text-center">${item.gstRate}%</td>
            <td class="text-right">${formatCurrency(
              (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)
            )}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span class="label">Subtotal</span>
          <span class="value">${formatCurrency(invoice.subtotal)}</span>
        </div>
        
        ${
          invoice.discountAmount > 0
            ? `
        <div class="totals-row discount">
          <span class="label">Discount ${
            invoice.discountType === "PERCENTAGE"
              ? `(${invoice.discountValue}%)`
              : ""
          }</span>
          <span class="value">- ${formatCurrency(invoice.discountAmount)}</span>
        </div>
        `
            : ""
        }

        ${
          invoice.cgst > 0
            ? `
        <div class="totals-row">
          <span class="label">CGST ${
            gstRates.cgst ? `(${gstRates.cgst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(invoice.cgst)}</span>
        </div>
        `
            : ""
        }

        ${
          invoice.sgst > 0
            ? `
        <div class="totals-row">
          <span class="label">SGST ${
            gstRates.sgst ? `(${gstRates.sgst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(invoice.sgst)}</span>
        </div>
        `
            : ""
        }

        ${
          invoice.igst > 0
            ? `
        <div class="totals-row">
          <span class="label">IGST ${
            gstRates.igst ? `(${gstRates.igst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(invoice.igst)}</span>
        </div>
        `
            : ""
        }

        

        ${
          invoice.tcsAmount > 0
            ? `
        <div class="totals-row">
          <span class="label">TCS (${invoice.tcsRate}%)</span>
          <span class="value" style="color: #9333ea;">+${formatCurrency(
            invoice.tcsAmount
          )}</span>
        </div>
        `
            : ""
        }

        ${
          invoice.roundOff !== 0
            ? `
        <div class="totals-row">
          <span class="label">Round Off</span>
          <span class="value">${formatCurrency(invoice.roundOff)}</span>
        </div>
        `
            : ""
        }

        <div class="totals-row total">
          <span class="label">Total Amount</span>
          <span class="value">${formatCurrency(invoice.totalAmount)}</span>
        </div>

        ${
          invoice.paidAmount > 0
            ? `
        <div class="totals-row paid">
          <span class="label">Paid Amount</span>
          <span class="value">${formatCurrency(invoice.paidAmount)}</span>
        </div>
        <div class="totals-row balance">
          <span class="label">Balance Due</span>
          <span class="value">${formatCurrency(invoice.balanceAmount)}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>

    <!-- GST Filing Status -->
    ${
      invoice.gstFilingStatus?.gstr1Filed ||
      invoice.gstFilingStatus?.gstr3bFiled
        ? `
    <div class="gst-filing-status">
      <h4>📊 GST Filing Status</h4>
      <div class="filing-indicators">
        ${
          invoice.gstFilingStatus?.gstr1Filed
            ? '<span class="filed">✓ GSTR-1 Filed</span>'
            : '<span class="pending">⚠ GSTR-1 Pending</span>'
        }
        ${
          invoice.gstFilingStatus?.gstr3bFiled
            ? '<span class="filed">✓ GSTR-3B Filed</span>'
            : '<span class="pending">⚠ GSTR-3B Pending</span>'
        }
        ${
          invoice.gstFilingStatus?.filingPeriod
            ? `<span style="color: #1f2937;">Period: ${invoice.gstFilingStatus.filingPeriod}</span>`
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    <!-- Amount in Words -->
    ${
      showAmountInWords
        ? `
    <div class="amount-in-words">
      <h4>Amount in Words</h4>
      <p>${invoice.amountInWords}</p>
    </div>
    `
        : ""
    }

    <!-- Reverse Charge Notice -->
    ${
      invoice.reverseCharge
        ? `
    <div class="reverse-charge-notice">
      <p>⚠️ REVERSE CHARGE APPLICABLE</p>
      <p>Tax is payable by the recipient under Section 9(3) of CGST Act, 2017</p>
    </div>
    `
        : ""
    }

    <!-- Notes -->
    ${
      invoice.notes
        ? `
    <div class="notes-section">
      <h4>Notes</h4>
      <p>${invoice.notes}</p>
    </div>
    `
        : ""
    }

    <!-- Terms & Conditions -->
    <div class="terms-section">
      <h4>Terms & Conditions</h4>
      <p>
        1. Payment is due within the specified due date. 2. Please include invoice number with payment. 3. Late payments may incur additional charges. 4. Goods once sold cannot be returned or exchanged.
      </p>
    </div>

    <!-- Bank Details -->
    ${
      showBankDetails
        ? `
    <div class="bank-details">
      <h4>Bank Details for Payment</h4>
      <div class="bank-details-grid">
        ${
          organization.bankDetails.bankName
            ? `<div class="bank-detail-item"><span class="label">Bank Name:</span><span class="value">${organization.bankDetails.bankName}</span></div>`
            : ""
        }
        ${
          organization.bankDetails.accountHolderName
            ? `<div class="bank-detail-item"><span class="label">Account Holder:</span><span class="value">${organization.bankDetails.accountHolderName}</span></div>`
            : ""
        }
        ${
          organization.bankDetails.accountNumber
            ? `<div class="bank-detail-item"><span class="label">Account Number:</span><span class="value">${organization.bankDetails.accountNumber}</span></div>`
            : ""
        }
        ${
          organization.bankDetails.ifscCode
            ? `<div class="bank-detail-item"><span class="label">IFSC Code:</span><span class="value">${organization.bankDetails.ifscCode}</span></div>`
            : ""
        }
        ${
          organization.bankDetails.branchName
            ? `<div class="bank-detail-item"><span class="label">Branch:</span><span class="value">${organization.bankDetails.branchName}</span></div>`
            : ""
        }
        ${
          organization.bankDetails.upiId
            ? `<div class="bank-detail-item"><span class="label">UPI ID:</span><span class="value">${organization.bankDetails.upiId}</span></div>`
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    <!-- ✅ UPI QR Code Payment Section (only if QR code was generated and balance > 0) -->
    ${upiQrCodeDataUrl && invoice.balanceAmount > 0 ? `
    <div class="qr-payment-section">
      <h3>🔒 Scan to Pay Securely via UPI</h3>
      <div class="qr-container">
        <img src="${upiQrCodeDataUrl}" alt="UPI Payment QR Code" class="qr-code-image" />
      </div>
      <div class="qr-amount">
        Pay: ${formatCurrency(invoice.balanceAmount)}
      </div>
      <div class="qr-instructions">
        Open any UPI app (Google Pay, PhonePe, Paytm, etc.)<br/>
        Scan the QR code above to pay instantly<br/>
        Payment will be credited directly to our account
      </div>
      ${organization.bankDetails.upiId ? `
      <div class="qr-upi-id">
        UPI ID: ${organization.bankDetails.upiId}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Prepared By / Verified By - ALWAYS SHOW -->
    <div class="authorization-section">
      <div class="authorization-item">
        <h5>Prepared By</h5>
        <p>${invoice.preparedBy || "_______________"}</p>
      </div>
      <div class="authorization-item">
        <h5>Verified By</h5>
        <p>${invoice.verifiedBy || "_______________"}</p>
      </div>
    </div>

    <!-- Signature -->
    ${
      showSignature
        ? `
    <div class="signature-section">
      <div>
        ${
          organization.authorizedSignatory.signatureImage
            ? `<img src="${process.env.BASE_URL || "http://localhost:5000"}/${
                organization.authorizedSignatory.signatureImage
              }" alt="Authorized Signature" class="signature-image" />`
            : ""
        }
        <div class="signature-line">
          <div class="signature-text">Authorized Signature</div>
          ${
            organization.authorizedSignatory.name
              ? `<div class="signature-name">${organization.authorizedSignatory.name}</div>`
              : ""
          }
          ${
            organization.authorizedSignatory.designation
              ? `<div class="signature-designation">${organization.authorizedSignatory.designation}</div>`
              : ""
          }
        </div>
      </div>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer">
      <p>This is a computer generated invoice and does not require a physical signature.</p>
      <p>For any queries, please contact: ${organization.email || ""} | ${
    organization.phone || ""
  }</p>
      <p style="margin-top: 10px; font-size: 10px;">
        <a href="/" style="color: #2563eb; text-decoration: none;">
          Powered by EasyTax ERP
        </a>
      </p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
};
