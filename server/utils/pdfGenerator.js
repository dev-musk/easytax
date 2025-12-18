// ============================================
// FILE: server/utils/pdfGenerator.js
// NEW FILE - Generate professional invoice PDF HTML
// ============================================

export const generateInvoicePDF = (invoice, organization) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isInterstate = invoice.igst > 0;

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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: white;
    }

    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      border: 1px solid #ddd;
      padding: 20px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    .company-details h1 {
      font-size: 24px;
      color: #2563eb;
      margin-bottom: 10px;
    }

    .company-details p {
      margin: 3px 0;
      font-size: 11px;
      color: #666;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      font-size: 28px;
      color: #2563eb;
      margin-bottom: 10px;
    }

    .invoice-title .invoice-number {
      font-size: 14px;
      font-weight: bold;
      color: #333;
    }

    .invoice-title .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 10px;
    }

    .status-paid {
      background-color: #dcfce7;
      color: #166534;
    }

    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-overdue {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .status-partially-paid {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .parties-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }

    .party-box {
      border: 1px solid #e5e7eb;
      padding: 15px;
      border-radius: 8px;
      background: #f9fafb;
    }

    .party-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .party-box .company-name {
      font-size: 15px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .party-box p {
      font-size: 11px;
      color: #4b5563;
      margin: 2px 0;
    }

    .dates-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .date-item h4 {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .date-item p {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table thead {
      background: #f3f4f6;
    }

    .items-table th {
      padding: 12px 8px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      color: #374151;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table th.text-center {
      text-align: center;
    }

    .items-table th.text-right {
      text-align: right;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .items-table td {
      padding: 12px 8px;
      font-size: 11px;
      color: #1f2937;
    }

    .items-table td.text-center {
      text-align: center;
    }

    .items-table td.text-right {
      text-align: right;
    }

    .items-table .item-description {
      font-weight: 600;
      color: #111827;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-box {
      width: 400px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
    }

    .totals-row:last-child {
      border-bottom: none;
    }

    .totals-row .label {
      font-size: 11px;
      color: #6b7280;
    }

    .totals-row .value {
      font-size: 11px;
      font-weight: 600;
      color: #1f2937;
    }

    .totals-row.subtotal {
      background: #f9fafb;
    }

    .totals-row.total {
      background: #2563eb;
      color: white;
      font-size: 13px;
    }

    .totals-row.total .label,
    .totals-row.total .value {
      color: white;
      font-weight: bold;
    }

    .totals-row.discount .value {
      color: #dc2626;
    }

    .totals-row.paid .value {
      color: #16a34a;
    }

    .totals-row.balance {
      background: #fee2e2;
    }

    .totals-row.balance .label,
    .totals-row.balance .value {
      color: #991b1b;
      font-weight: bold;
    }

    .notes-section {
      margin-bottom: 20px;
      padding: 15px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }

    .notes-section h4 {
      font-size: 11px;
      text-transform: uppercase;
      color: #92400e;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .notes-section p {
      font-size: 11px;
      color: #78350f;
      white-space: pre-wrap;
    }

    .terms-section {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 4px;
    }

    .terms-section h4 {
      font-size: 11px;
      text-transform: uppercase;
      color: #4b5563;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .terms-section p {
      font-size: 10px;
      color: #6b7280;
      line-height: 1.8;
    }

    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .footer p {
      font-size: 10px;
      color: #9ca3af;
    }

    .signature-section {
      margin-top: 40px;
      text-align: right;
      padding-right: 15px;
    }

    .signature-line {
      display: inline-block;
      width: 200px;
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 60px;
    }

    .signature-text {
      font-size: 11px;
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
        <h1>${organization.name || 'Your Company'}</h1>
        ${organization.address ? `<p>${organization.address}</p>` : ''}
        ${
          organization.city && organization.state
            ? `<p>${organization.city}, ${organization.state} - ${organization.pincode || ''}</p>`
            : ''
        }
        ${organization.gstin ? `<p><strong>GSTIN:</strong> ${organization.gstin}</p>` : ''}
        ${organization.pan ? `<p><strong>PAN:</strong> ${organization.pan}</p>` : ''}
        ${organization.email ? `<p><strong>Email:</strong> ${organization.email}</p>` : ''}
        ${organization.phone ? `<p><strong>Phone:</strong> ${organization.phone}</p>` : ''}
      </div>
      <div class="invoice-title">
        <h2>${invoice.invoiceType === 'PROFORMA' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}</h2>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <span class="status-badge status-${invoice.status.toLowerCase().replace('_', '-')}">
          ${invoice.status.replace('_', ' ')}
        </span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties-section">
      <div class="party-box">
        <h3>Bill To</h3>
        <div class="company-name">${invoice.client?.companyName || 'Client Name'}</div>
        ${invoice.client?.billingAddress ? `<p>${invoice.client.billingAddress}</p>` : ''}
        ${
          invoice.client?.billingCity && invoice.client?.billingState
            ? `<p>${invoice.client.billingCity}, ${invoice.client.billingState}</p>`
            : ''
        }
        ${invoice.client?.gstin ? `<p><strong>GSTIN:</strong> ${invoice.client.gstin}</p>` : ''}
        ${invoice.client?.email ? `<p><strong>Email:</strong> ${invoice.client.email}</p>` : ''}
      </div>
      
      ${
        invoice.client?.shippingAddress
          ? `
      <div class="party-box">
        <h3>Ship To</h3>
        <div class="company-name">${invoice.client?.companyName || ''}</div>
        <p>${invoice.client?.shippingAddress || ''}</p>
        ${
          invoice.client?.shippingCity && invoice.client?.shippingState
            ? `<p>${invoice.client.shippingCity}, ${invoice.client.shippingState}</p>`
            : ''
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
          (new Date(invoice.dueDate) - new Date(invoice.invoiceDate)) / (1000 * 60 * 60 * 24)
        )} Days</p>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 35%;">Description</th>
          <th class="text-center" style="width: 10%;">HSN/SAC</th>
          <th class="text-center" style="width: 8%;">Qty</th>
          <th class="text-right" style="width: 12%;">Rate</th>
          <th class="text-center" style="width: 8%;">GST%</th>
          <th class="text-right" style="width: 12%;">Tax Amount</th>
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
            </td>
            <td class="text-center">${item.hsnSac || '-'}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.rate)}</td>
            <td class="text-center">${item.gstRate}%</td>
            <td class="text-right">${formatCurrency(
              item.cgst + item.sgst + item.igst || 0
            )}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `
          )
          .join('')}
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
            invoice.discountType === 'PERCENTAGE' ? `(${invoice.discountValue}%)` : ''
          }</span>
          <span class="value">- ${formatCurrency(invoice.discountAmount)}</span>
        </div>
        `
            : ''
        }

        ${
          invoice.cgst > 0
            ? `
        <div class="totals-row">
          <span class="label">CGST</span>
          <span class="value">${formatCurrency(invoice.cgst)}</span>
        </div>
        `
            : ''
        }

        ${
          invoice.sgst > 0
            ? `
        <div class="totals-row">
          <span class="label">SGST</span>
          <span class="value">${formatCurrency(invoice.sgst)}</span>
        </div>
        `
            : ''
        }

        ${
          invoice.igst > 0
            ? `
        <div class="totals-row">
          <span class="label">IGST</span>
          <span class="value">${formatCurrency(invoice.igst)}</span>
        </div>
        `
            : ''
        }

        ${
          invoice.roundOff !== 0
            ? `
        <div class="totals-row">
          <span class="label">Round Off</span>
          <span class="value">${formatCurrency(invoice.roundOff)}</span>
        </div>
        `
            : ''
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
            : ''
        }
      </div>
    </div>

    <!-- Notes -->
    ${
      invoice.notes
        ? `
    <div class="notes-section">
      <h4>Notes</h4>
      <p>${invoice.notes}</p>
    </div>
    `
        : ''
    }

    <!-- Terms & Conditions -->
    <div class="terms-section">
      <h4>Terms & Conditions</h4>
      <p>
        1. Payment is due within the specified due date.<br>
        2. Please include invoice number with payment.<br>
        3. Late payments may incur additional charges.<br>
        4. Goods once sold cannot be returned or exchanged.
      </p>
    </div>

    <!-- Signature -->
    <div class="signature-section">
      <div>
        <div class="signature-line">
          <div class="signature-text">Authorized Signature</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This is a computer generated invoice and does not require a physical signature.</p>
      <p>For any queries, please contact: ${organization.email || ''} | ${
    organization.phone || ''
  }</p>
    </div>
  </div>

  <script>
    // Auto print when opened in new window
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