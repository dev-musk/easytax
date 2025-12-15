// ============================================
// FILE: server/utils/pdfGenerator.js
// Generate Professional Invoice PDF
// ============================================

export const generateInvoicePDF = (invoice, organization) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .company-info h1 { color: #2563eb; font-size: 28px; margin-bottom: 5px; }
    .company-info p { color: #666; font-size: 12px; line-height: 1.6; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { color: #2563eb; font-size: 32px; margin-bottom: 10px; }
    .invoice-info p { font-size: 12px; color: #666; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .address-box { width: 48%; }
    .address-box h3 { color: #2563eb; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
    .address-box p { font-size: 12px; line-height: 1.8; color: #666; }
    .address-box .company-name { font-weight: bold; color: #333; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead { background: #2563eb; color: white; }
    thead th { padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    tbody tr:hover { background: #f9fafb; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { margin-left: auto; width: 400px; }
    .totals table { margin-bottom: 0; }
    .totals td { border: none; padding: 8px 12px; }
    .totals .label { color: #666; font-weight: 500; }
    .totals .value { text-align: right; font-weight: bold; }
    .total-row { background: #f3f4f6; font-size: 16px !important; }
    .total-row td { padding: 15px 12px !important; color: #2563eb; }
    .notes { margin-top: 40px; padding: 20px; background: #f9fafb; border-left: 4px solid #2563eb; }
    .notes h3 { color: #2563eb; font-size: 14px; margin-bottom: 10px; }
    .notes p { font-size: 12px; line-height: 1.8; color: #666; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #999; font-size: 11px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${organization.name}</h1>
      <p>${organization.address || ''}</p>
      <p>${organization.city ? `${organization.city}, ` : ''}${organization.state || ''} ${organization.pincode || ''}</p>
      ${organization.gstin ? `<p><strong>GSTIN:</strong> ${organization.gstin}</p>` : ''}
      ${organization.pan ? `<p><strong>PAN:</strong> ${organization.pan}</p>` : ''}
      <p><strong>Email:</strong> ${organization.email}</p>
      ${organization.phone ? `<p><strong>Phone:</strong> ${organization.phone}</p>` : ''}
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
      <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
      <p style="margin-top: 10px;">
        <span class="status-badge status-${invoice.status.toLowerCase().replace('_', '-')}">
          ${invoice.status.replace('_', ' ')}
        </span>
      </p>
    </div>
  </div>

  <div class="addresses">
    <div class="address-box">
      <h3>Bill To:</h3>
      <p class="company-name">${invoice.client.companyName}</p>
      ${invoice.client.contactPerson ? `<p>${invoice.client.contactPerson}</p>` : ''}
      ${invoice.client.billingAddress ? `<p>${invoice.client.billingAddress}</p>` : ''}
      <p>${invoice.client.billingCity || ''}, ${invoice.client.billingState || ''} ${invoice.client.billingPincode || ''}</p>
      ${invoice.client.gstin ? `<p><strong>GSTIN:</strong> ${invoice.client.gstin}</p>` : ''}
      ${invoice.client.email ? `<p><strong>Email:</strong> ${invoice.client.email}</p>` : ''}
      ${invoice.client.phone ? `<p><strong>Phone:</strong> ${invoice.client.phone}</p>` : ''}
    </div>
    ${!invoice.client.sameAsBilling ? `
    <div class="address-box">
      <h3>Ship To:</h3>
      <p class="company-name">${invoice.client.companyName}</p>
      ${invoice.client.shippingAddress ? `<p>${invoice.client.shippingAddress}</p>` : ''}
      <p>${invoice.client.shippingCity || ''}, ${invoice.client.shippingState || ''} ${invoice.client.shippingPincode || ''}</p>
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 40%;">Description</th>
        <th style="width: 15%;">HSN/SAC</th>
        <th class="text-center" style="width: 10%;">Qty</th>
        <th class="text-right" style="width: 12%;">Rate</th>
        <th class="text-right" style="width: 8%;">GST</th>
        <th class="text-right" style="width: 15%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsnSacCode}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${item.gstRate}%</td>
          <td class="text-right">₹${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td class="label">Subtotal:</td>
        <td class="value">₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ${invoice.discountAmount > 0 ? `
      <tr>
        <td class="label">Discount ${invoice.discountType === 'PERCENTAGE' ? `(${invoice.discountValue}%)` : ''}:</td>
        <td class="value" style="color: #dc2626;">-₹${invoice.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="label">Taxable Amount:</td>
        <td class="value">₹${(invoice.subtotal - invoice.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      ${invoice.cgst > 0 ? `
      <tr>
        <td class="label">CGST:</td>
        <td class="value">₹${invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td class="label">SGST:</td>
        <td class="value">₹${invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      ${invoice.igst > 0 ? `
      <tr>
        <td class="label">IGST:</td>
        <td class="value">₹${invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      ${invoice.roundOff !== 0 ? `
      <tr>
        <td class="label">Round Off:</td>
        <td class="value">₹${invoice.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td class="label">Total Amount:</td>
        <td class="value">₹${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ${invoice.paidAmount > 0 ? `
      <tr>
        <td class="label">Paid Amount:</td>
        <td class="value" style="color: #059669;">₹${invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td class="label">Balance Due:</td>
        <td class="value" style="color: #dc2626;">₹${invoice.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      ` : ''}
    </table>
  </div>

  ${invoice.notes ? `
  <div class="notes">
    <h3>Notes / Payment Terms:</h3>
    <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  ${invoice.termsConditions ? `
  <div class="notes" style="margin-top: 20px;">
    <h3>Terms & Conditions:</h3>
    <p>${invoice.termsConditions.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is a computer-generated invoice and does not require a signature.</p>
    <p>Generated on ${new Date().toLocaleString('en-IN')} | Powered by EasyTaxERP</p>
  </div>
</body>
</html>
  `;

  return html;
};




