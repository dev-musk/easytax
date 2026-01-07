// ============================================
// FILE: server/utils/emailTemplate.js
// ✅ FEATURE #27: Invoice Reminder Email Template
// ============================================

export const generateInvoiceReminderEmail = (invoice, organization, client) => {
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  
  const isOverdue = daysOverdue > 0;
  const isDueSoon = daysOverdue >= -3 && daysOverdue < 0;
  
  let reminderMessage = '';
  if (isOverdue) {
    reminderMessage = `This invoice is <strong>${daysOverdue} days overdue</strong>. Please arrange payment at your earliest convenience.`;
  } else if (isDueSoon) {
    reminderMessage = `This invoice is due in <strong>${Math.abs(daysOverdue)} days</strong>. Please ensure timely payment.`;
  } else {
    reminderMessage = 'This is a friendly reminder about your pending invoice.';
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder - ${invoice.invoiceNumber}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .decorative-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 28px;
      font-weight: 600;
      margin: 10px 0;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #333;
      margin-bottom: 20px;
    }
    .reminder-box {
      background: ${isOverdue ? '#fee' : isDueSoon ? '#fff3cd' : '#e3f2fd'};
      border-left: 4px solid ${isOverdue ? '#dc3545' : isDueSoon ? '#ffc107' : '#2196f3'};
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .reminder-text {
      color: ${isOverdue ? '#721c24' : isDueSoon ? '#856404' : '#004085'};
      font-size: 14px;
      margin: 0;
    }
    .due-amount-label {
      text-align: center;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 30px;
      margin-bottom: 10px;
    }
    .due-amount {
      text-align: center;
      font-size: 48px;
      font-weight: bold;
      color: #dc3545;
      margin: 10px 0;
    }
    .invoice-date {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin-top: 15px;
    }
    .invoice-details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #666;
      font-size: 14px;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
      font-size: 14px;
    }
    .payment-button {
      display: block;
      width: 100%;
      max-width: 300px;
      margin: 30px auto;
      padding: 15px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    }
    .payment-button:hover {
      box-shadow: 0 6px 8px rgba(102, 126, 234, 0.4);
    }
    .bank-details {
      background: #fff8e1;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #ffc107;
    }
    .bank-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .bank-info {
      font-size: 14px;
      color: #555;
      line-height: 1.8;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #dee2e6;
    }
    .footer-company {
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }
    .footer-contact {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="decorative-icon">🧾</div>
      <div class="company-name">${organization.name}</div>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Dear ${client.companyName},</p>
      
      <div class="reminder-box">
        <p class="reminder-text">${reminderMessage}</p>
      </div>

      <!-- Due Amount Display -->
      <div class="due-amount-label">Due Amount</div>
      <div class="due-amount">₹${invoice.balanceAmount.toLocaleString('en-IN')}</div>
      <div class="invoice-date">Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })}</div>

      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Number:</span>
          <span class="detail-value">${invoice.invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice Date:</span>
          <span class="detail-value">${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value" style="color: ${isOverdue ? '#dc3545' : '#333'}">
            ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            ${isOverdue ? ' (OVERDUE)' : ''}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Amount:</span>
          <span class="detail-value">₹${invoice.totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span class="detail-value" style="color: #28a745">₹${invoice.paidAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Balance Due:</span>
          <span class="detail-value" style="color: #dc3545; font-size: 16px">₹${invoice.balanceAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Payment Button -->
      ${organization.bankDetails?.upiId ? `
        <a href="upi://pay?pa=${organization.bankDetails.upiId}&pn=${encodeURIComponent(organization.name)}&am=${invoice.balanceAmount}&cu=INR&tn=${encodeURIComponent('Payment for ' + invoice.invoiceNumber)}" class="payment-button">
          💳 Pay Now via UPI
        </a>
      ` : ''}

      <!-- Bank Details -->
      ${organization.bankDetails ? `
        <div class="bank-details">
          <div class="bank-title">Bank Transfer Details</div>
          <div class="bank-info">
            <strong>Bank Name:</strong> ${organization.bankDetails.bankName || 'N/A'}<br>
            <strong>Account Name:</strong> ${organization.bankDetails.accountHolderName || organization.name}<br>
            <strong>Account Number:</strong> ${organization.bankDetails.accountNumber || 'N/A'}<br>
            <strong>IFSC Code:</strong> ${organization.bankDetails.ifscCode || 'N/A'}<br>
            ${organization.bankDetails.branch ? `<strong>Branch:</strong> ${organization.bankDetails.branch}<br>` : ''}
            ${organization.bankDetails.upiId ? `<strong>UPI ID:</strong> ${organization.bankDetails.upiId}<br>` : ''}
          </div>
        </div>
      ` : ''}

      <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6">
        Please make the payment at your earliest convenience. If you have already made the payment, 
        please ignore this reminder and accept our thanks.
      </p>

      <p style="font-size: 14px; color: #666; line-height: 1.6">
        For any queries regarding this invoice, please feel free to contact us.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-company">${organization.name}</div>
      <div class="footer-contact">${organization.address || ''}, ${organization.city || ''}, ${organization.state || ''} ${organization.pincode || ''}</div>
      ${organization.email ? `<div class="footer-contact">Email: ${organization.email}</div>` : ''}
      ${organization.phone ? `<div class="footer-contact">Phone: ${organization.phone}</div>` : ''}
      ${organization.gstin ? `<div class="footer-contact">GSTIN: ${organization.gstin}</div>` : ''}
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
        <small style="color: #999">
          This is an automated reminder from ${organization.name}. 
          Please do not reply to this email.
        </small>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// ✅ FEATURE #31: Daily Report Email Template
export const generateDailyReportEmail = (reportData, organization) => {
  const { 
    date, 
    totalSales, 
    totalPayments, 
    newInvoices, 
    overdueInvoices,
    pendingAmount,
    topClients,
    recentActivity 
  } = reportData;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Business Report - ${date}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 700px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header-title {
      font-size: 28px;
      font-weight: 600;
      margin: 10px 0;
    }
    .header-date {
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2a5298;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    .stat-value.positive {
      color: #28a745;
    }
    .stat-value.negative {
      color: #dc3545;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #2a5298;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
      color: #333;
    }
    .alert-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-text {
      color: #856404;
      font-size: 14px;
      margin: 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #dee2e6;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div>📊</div>
      <div class="header-title">Daily Business Report</div>
      <div class="header-date">${new Date(date).toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</div>
    </div>

    <div class="content">
      <h2 style="color: #333; margin-top: 0;">Hi ${organization.name},</h2>
      <p style="color: #666; line-height: 1.6;">Here's your daily business summary:</p>

      <!-- Key Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value positive">₹${totalSales.toLocaleString('en-IN')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Payments Received</div>
          <div class="stat-value positive">₹${totalPayments.toLocaleString('en-IN')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">New Invoices</div>
          <div class="stat-value">${newInvoices.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Amount</div>
          <div class="stat-value negative">₹${pendingAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      ${overdueInvoices.length > 0 ? `
        <div class="alert-box">
          <p class="alert-text">
            <strong>⚠️ Attention Required:</strong> You have ${overdueInvoices.length} overdue invoice(s) totaling 
            ₹${overdueInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0).toLocaleString('en-IN')}
          </p>
        </div>
      ` : ''}

      <!-- New Invoices Today -->
      ${newInvoices.length > 0 ? `
        <div class="section-title">New Invoices (${newInvoices.length})</div>
        <table class="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${newInvoices.slice(0, 5).map(inv => `
              <tr>
                <td>${inv.invoiceNumber}</td>
                <td>${inv.client?.companyName || 'N/A'}</td>
                <td>₹${inv.totalAmount.toLocaleString('en-IN')}</td>
                <td style="color: ${inv.status === 'PAID' ? '#28a745' : '#ffc107'}">${inv.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${newInvoices.length > 5 ? `<p style="font-size: 12px; color: #666;">... and ${newInvoices.length - 5} more</p>` : ''}
      ` : '<p style="color: #666;">No new invoices today.</p>'}

      <!-- Top Clients -->
      ${topClients && topClients.length > 0 ? `
        <div class="section-title">Top Clients This Month</div>
        <table class="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Invoices</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${topClients.slice(0, 5).map(client => `
              <tr>
                <td>${client.name}</td>
                <td>${client.invoiceCount}</td>
                <td>₹${client.totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
        This report was automatically generated at ${new Date().toLocaleTimeString('en-IN')}.
        Login to your dashboard for detailed analytics.
      </p>
    </div>

    <div class="footer">
      <div style="font-weight: 600; color: #333; margin-bottom: 10px;">${organization.name}</div>
      <div>Automated Daily Report System</div>
      <div style="margin-top: 10px; color: #999;">
        <small>To change report preferences, contact your administrator.</small>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};