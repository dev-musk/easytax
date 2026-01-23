// ============================================
// FILE: server/utils/quotationPdfGenerator.js
// ✅ NEW FILE: Generate Quotation PDF with QR Code
// ============================================

import QRCode from "qrcode";

export const generateQuotationPDF = async (quotation, organization) => {
  // ✅ Generate UPI QR Code if UPI ID exists
  let upiQrCodeDataUrl = null;

  if (organization?.bankDetails?.upiId && quotation.totalAmount > 0) {
    try {
      const upiString = `upi://pay?pa=${
        organization.bankDetails.upiId
      }&pn=${encodeURIComponent(organization.name)}&am=${
        quotation.totalAmount
      }&cu=INR&tn=${encodeURIComponent(
        `Payment for Quotation ${quotation.quotationNumber}`
      )}`;

      upiQrCodeDataUrl = await QRCode.toDataURL(upiString, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      console.log("✅ UPI QR Code generated for Quotation PDF");
    } catch (error) {
      console.error("❌ Error generating UPI QR code:", error);
    }
  }

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

  const calculateGSTRate = () => {
    if (quotation.cgst > 0 && quotation.subtotal > 0) {
      const taxableAmount =
        quotation.subtotal - (quotation.discountAmount || 0);
      const cgstRate = ((quotation.cgst / taxableAmount) * 100).toFixed(2);
      const sgstRate = ((quotation.sgst / taxableAmount) * 100).toFixed(2);
      return { cgst: cgstRate, sgst: sgstRate };
    } else if (quotation.igst > 0 && quotation.subtotal > 0) {
      const taxableAmount =
        quotation.subtotal - (quotation.discountAmount || 0);
      const igstRate = ((quotation.igst / taxableAmount) * 100).toFixed(2);
      return { igst: igstRate };
    }
    return {};
  };

  const gstRates = calculateGSTRate();
  const isExpired = new Date(quotation.validUntil) < new Date();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quotation.quotationNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #333;
      padding: 15mm;
      background: white;
    }

    .quotation-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #3b82f6;
    }

    .company-logo {
      max-height: 70px;
      max-width: 180px;
      object-fit: contain;
      margin-bottom: 10px;
    }

    .company-details h1 {
      font-size: 20px;
      color: #3b82f6;
      margin-bottom: 8px;
    }

    .company-details p {
      margin: 2px 0;
      font-size: 9px;
      color: #666;
    }

    .quotation-title {
      text-align: right;
    }

    .quotation-title h2 {
      font-size: 28px;
      color: #3b82f6;
      margin-bottom: 8px;
      font-weight: bold;
    }

    .quotation-number {
      font-size: 12px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-draft { background: #f3f4f6; color: #374151; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-accepted { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-expired { background: #ffedd5; color: #9a3412; }
    .status-converted { background: #f3e8ff; color: #7e22ce; }

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
    }

    .dates-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
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

    .expiry-warning {
      background: #ffedd5;
      border-left: 4px solid #ea580c;
      padding: 10px 12px;
      margin-bottom: 15px;
      border-radius: 4px;
    }

    .expiry-warning p {
      font-size: 9px;
      color: #9a3412;
      font-weight: 600;
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
    }

    .items-table td.text-center { text-align: center; }
    .items-table td.text-right { text-align: right; }

    .item-description {
      font-weight: 600;
      color: #111827;
      font-size: 10px;
    }

    .item-sub-description {
      font-size: 8px;
      color: #666;
      font-style: italic;
      margin-top: 3px;
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

    .totals-row.total {
      background: #3b82f6;
      color: white;
      font-size: 11px;
      padding: 10px 12px;
    }

    .totals-row.total .label,
    .totals-row.total .value {
      color: white;
      font-weight: bold;
    }

    .amount-in-words {
      margin-bottom: 15px;
      padding: 10px 12px;
      background: #dbeafe;
      border-left: 3px solid #3b82f6;
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
      white-space: pre-wrap;
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

    .qr-payment-section {
      margin-top: 20px;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
    }

    .qr-payment-section h3 {
      color: white;
      font-size: 14px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .qr-container {
      background: white;
      padding: 15px;
      border-radius: 6px;
      display: inline-block;
      margin: 10px auto;
      display: flex;
        justify-content: center;
        align-items: center;
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
      margin-top: 10px;
      line-height: 1.6;
    }

    .qr-amount {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 8px 15px;
      border-radius: 4px;
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
      display: inline-block;
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

    @media print {
      body { padding: 0; }
      .quotation-container { border: none; padding: 0; }
      .no-print { display: none; }
    }

    @page {
      size: A4;
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="quotation-container">
    <!-- Header -->
    <div class="header">
      <div class="company-details">
        ${
          organization?.logo
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
      <div class="quotation-title">
        <h2>QUOTATION</h2>
        <div class="quotation-number">${quotation.quotationNumber}</div>
        <span class="status-badge status-${quotation.status.toLowerCase()}">
          ${quotation.status}
        </span>
      </div>
    </div>

    <!-- Expiry Warning -->
    ${
      isExpired
        ? `
    <div class="expiry-warning">
      <p>⚠️ This quotation has expired on ${formatDate(
        quotation.validUntil
      )}</p>
    </div>
    `
        : ""
    }

    <!-- Parties -->
    <div class="parties-section">
      <div class="party-box">
        <h3>Client Details</h3>
        <div class="company-name">${
          quotation.client?.companyName || "Client Name"
        }</div>
        ${
          quotation.client?.billingAddress
            ? `<p>${quotation.client.billingAddress}</p>`
            : ""
        }
        ${
          quotation.client?.billingCity && quotation.client?.billingState
            ? `<p>${quotation.client.billingCity}, ${quotation.client.billingState}</p>`
            : ""
        }
        ${
          quotation.client?.gstin
            ? `<p><strong>GSTIN:</strong> ${quotation.client.gstin}</p>`
            : ""
        }
        ${
          quotation.client?.email
            ? `<p><strong>Email:</strong> ${quotation.client.email}</p>`
            : ""
        }
        ${
          quotation.client?.phone
            ? `<p><strong>Phone:</strong> ${quotation.client.phone}</p>`
            : ""
        }
      </div>
      <div class="dates-section">
        <div class="date-item">
          <h4>Quotation Date</h4>
          <p>${formatDate(quotation.quotationDate)}</p>
        </div>
        <div class="date-item">
          <h4>Valid Until</h4>
          <p style="${isExpired ? "color: #dc2626;" : ""}">${formatDate(
    quotation.validUntil
  )}</p>
        </div>
      </div>
    </div>

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
        ${quotation.items
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
            <td class="text-center">${item.quantity} ${item.unit || "PCS"}</td>
            <td class="text-right">${formatCurrency(item.rate)}</td>
            <td class="text-center">${item.gstRate}%</td>
            <td class="text-right">${formatCurrency(
              (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)
            )}</td>
            <td class="text-right">${formatCurrency(
              item.totalAmount || item.amount
            )}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatCurrency(quotation.subtotal)}</span>
        </div>
        ${
          quotation.discountAmount > 0
            ? `
        <div class="totals-row">
          <span class="label">Discount ${
            quotation.discountType === "PERCENTAGE"
              ? `(${quotation.discountValue}%)`
              : ""
          }</span>
          <span class="value" style="color: #dc2626;">-${formatCurrency(
            quotation.discountAmount
          )}</span>
        </div>
        `
            : ""
        }
        ${
          quotation.cgst > 0
            ? `
        <div class="totals-row">
          <span class="label">CGST ${
            gstRates.cgst ? `(${gstRates.cgst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(quotation.cgst)}</span>
        </div>
        <div class="totals-row">
          <span class="label">SGST ${
            gstRates.sgst ? `(${gstRates.sgst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(quotation.sgst)}</span>
        </div>
        `
            : ""
        }
        ${
          quotation.igst > 0
            ? `
        <div class="totals-row">
          <span class="label">IGST ${
            gstRates.igst ? `(${gstRates.igst}%)` : ""
          }</span>
          <span class="value">${formatCurrency(quotation.igst)}</span>
        </div>
        `
            : ""
        }
        ${
          quotation.roundOff !== 0
            ? `
        <div class="totals-row">
          <span class="label">Round Off</span>
          <span class="value">${formatCurrency(quotation.roundOff)}</span>
        </div>
        `
            : ""
        }
        <div class="totals-row total">
          <span class="label">Total Amount</span>
          <span class="value">${formatCurrency(quotation.totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Amount in Words -->
    ${
      quotation.amountInWords
        ? `
    <div class="amount-in-words">
      <h4>Amount in Words</h4>
      <p>${quotation.amountInWords}</p>
    </div>
    `
        : ""
    }

    <!-- Notes -->
    ${
      quotation.notes
        ? `
    <div class="notes-section">
      <h4>Notes</h4>
      <p>${quotation.notes}</p>
    </div>
    `
        : ""
    }

    <!-- Terms & Conditions -->
    ${
      quotation.termsConditions
        ? `
    <div class="terms-section">
      <h4>Terms & Conditions</h4>
      <p>${quotation.termsConditions}</p>
    </div>
    `
        : `
    <div class="terms-section">
      <h4>Terms & Conditions</h4>
      <p>1. This quotation is valid until ${formatDate(quotation.validUntil)}
2. Prices are inclusive of all taxes
3. Payment terms to be discussed upon acceptance
4. Delivery timeline will be confirmed after order placement</p>
    </div>
    `
    }

    <!-- Bank Details -->
    ${
      organization?.bankDetails
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
          organization.bankDetails.upiId
            ? `<div class="bank-detail-item"><span class="label">UPI ID:</span><span class="value">${organization.bankDetails.upiId}</span></div>`
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    <!-- UPI QR Code -->
    ${
      upiQrCodeDataUrl
        ? `
    <div class="qr-payment-section">
      <h3>🔒 Scan to Pay via UPI</h3>
      <div class="qr-container">
        <img src="${upiQrCodeDataUrl}" alt="UPI Payment QR Code" class="qr-code-image" />
      </div>
      <div class="qr-amount">
        Amount: ${formatCurrency(quotation.totalAmount)}
      </div>
      <div class="qr-instructions">
        Scan with any UPI app to accept and pay<br/>
        (Google Pay, PhonePe, Paytm, etc.)
      </div>
    </div>
    `
        : ""
    }

    <!-- Signature -->
    ${
      organization?.authorizedSignatory
        ? `
    <div class="signature-section">
      <div class="signature-line">
        <div class="signature-text">For ${organization.name}</div>
        ${
          organization.authorizedSignatory.name
            ? `<div class="signature-name">${organization.authorizedSignatory.name}</div>`
            : ""
        }
        ${
          organization.authorizedSignatory.designation
            ? `<div class="signature-text">${organization.authorizedSignatory.designation}</div>`
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer">
      <p>This is a computer-generated quotation and does not require a physical signature.</p>
      <p>For any queries, contact: ${organization.email || ""} | ${
    organization.phone || ""
  }</p>
      <p style="margin-top: 10px; font-size: 10px;">
        <a href="/" style="color: #3b82f6; text-decoration: none;">Powered by EasyTax ERP</a>
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
