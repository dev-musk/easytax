// ============================================
// FILE: server/services/emailService.js
// ✅ FEATURE #2: Send Invoice Reminder Emails
// ============================================

import nodemailer from 'nodemailer';

// ✅ Create email transporter
let transporter = null;

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ✅ Initialize transporter
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// ✅ Test email configuration
export const testEmailConfig = async () => {
  try {
    const mailer = getTransporter();
    await mailer.verify();
    console.log('✅ Email service configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    throw error;
  }
};

// ✅ Send invoice reminder email
export const sendInvoiceReminder = async (invoice, organization, client) => {
  try {
    if (!client?.email) {
      throw new Error('Client email not found');
    }

    const mailer = getTransporter();

    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    // Determine email subject
    let emailSubject = `Payment Reminder for Invoice ${invoice.invoiceNumber}`;
    if (daysOverdue > 0) {
      emailSubject = `URGENT: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`;
    }

    // Create HTML email body
    const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .header {
          background: #2563eb;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          padding: 20px;
          background: #f9fafb;
        }
        .invoice-details {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          border-left: 4px solid #2563eb;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #666;
        }
        .value {
          color: #333;
        }
        .amount {
          color: #dc2626;
          font-weight: bold;
          font-size: 18px;
        }
        .overdue-notice {
          background: #fee2e2;
          border: 2px solid #dc2626;
          color: #991b1b;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          text-align: center;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .company-info {
          font-size: 12px;
          color: #666;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${emailSubject}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${client.companyName},</p>
          
          ${
            daysOverdue > 0
              ? `
            <div class="overdue-notice">
              ⚠️ This invoice is ${daysOverdue} days overdue!<br>
              Please arrange payment immediately.
            </div>
          `
              : `
            <p>This is a friendly reminder that payment for the following invoice is due:</p>
          `
          }

          <div class="invoice-details">
            <div class="detail-row">
              <span class="label">Invoice Number:</span>
              <span class="value">${invoice.invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">Invoice Date:</span>
              <span class="value">${new Date(invoice.invoiceDate).toLocaleDateString(
                'en-IN'
              )}</span>
            </div>
            <div class="detail-row">
              <span class="label">Due Date:</span>
              <span class="value">${new Date(invoice.dueDate).toLocaleDateString(
                'en-IN'
              )}</span>
            </div>
            <div class="detail-row">
              <span class="label">Invoice Amount:</span>
              <span class="amount">₹${invoice.totalAmount.toLocaleString(
                'en-IN'
              )}</span>
            </div>
            ${
              invoice.paidAmount > 0
                ? `
              <div class="detail-row">
                <span class="label">Paid Amount:</span>
                <span class="value">₹${invoice.paidAmount.toLocaleString(
                  'en-IN'
                )}</span>
              </div>
              <div class="detail-row">
                <span class="label">Balance Due:</span>
                <span class="amount">₹${invoice.balanceAmount.toLocaleString(
                  'en-IN'
                )}</span>
              </div>
            `
                : ''
            }
          </div>

          <p><strong>Payment Details:</strong></p>
          ${
            organization?.bankDetails
              ? `
            <div class="invoice-details">
              ${
                organization.bankDetails.bankName
                  ? `<div class="detail-row"><span class="label">Bank:</span><span class="value">${organization.bankDetails.bankName}</span></div>`
                  : ''
              }
              ${
                organization.bankDetails.accountHolderName
                  ? `<div class="detail-row"><span class="label">Account Holder:</span><span class="value">${organization.bankDetails.accountHolderName}</span></div>`
                  : ''
              }
              ${
                organization.bankDetails.accountNumber
                  ? `<div class="detail-row"><span class="label">Account Number:</span><span class="value">${organization.bankDetails.accountNumber}</span></div>`
                  : ''
              }
              ${
                organization.bankDetails.ifscCode
                  ? `<div class="detail-row"><span class="label">IFSC Code:</span><span class="value">${organization.bankDetails.ifscCode}</span></div>`
                  : ''
              }
              ${
                organization.bankDetails.upiId
                  ? `<div class="detail-row"><span class="label">UPI ID:</span><span class="value">${organization.bankDetails.upiId}</span></div>`
                  : ''
              }
            </div>
          `
              : `<p>Bank details not configured. Please contact us for payment information.</p>`
          }

          <p style="margin-top: 20px; color: #666;">
            If you have already sent the payment, please disregard this reminder. 
            If you have any questions regarding this invoice, please don't hesitate to contact us.
          </p>

          <p style="margin-top: 20px;">
            Thank you for your prompt attention to this matter.
          </p>

          <p>
            Best regards,<br>
            <strong>${organization.name}</strong><br>
            ${organization.email ? `Email: ${organization.email}<br>` : ''}
            ${organization.phone ? `Phone: ${organization.phone}` : ''}
          </p>

          <div class="company-info">
            ${organization.gstin ? `GSTIN: ${organization.gstin}<br>` : ''}
            ${organization.pan ? `PAN: ${organization.pan}` : ''}
          </div>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply directly to this email.</p>
          <p>© ${new Date().getFullYear()} ${organization.name}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: client.email,
      cc: organization.email || undefined,
      subject: emailSubject,
      html: emailBody,
      replyTo: organization.email,
    };

    console.log('📧 Sending reminder email to:', client.email);

    const info = await mailer.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('❌ Send reminder error:', error);
    throw error;
  }
};

// ✅ Send daily report email
export const sendDailyReport = async (reportData, organization, recipientEmail) => {
  try {
    const mailer = getTransporter();

    const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .header {
          background: #2563eb;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          padding: 20px;
          background: #f9fafb;
        }
        .stat-box {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin: 10px 0;
          border-left: 4px solid #2563eb;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          padding: 20px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Business Report</h1>
          <p>${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          <p>Here's your daily business summary:</p>

          <div class="stat-box">
            <div class="stat-label">Total Invoices</div>
            <div class="stat-value">${reportData.totalInvoices || 0}</div>
          </div>

          <div class="stat-box">
            <div class="stat-label">Outstanding Amount</div>
            <div class="stat-value">₹${(
              reportData.outstandingAmount || 0
            ).toLocaleString('en-IN')}</div>
          </div>

          <div class="stat-box">
            <div class="stat-label">Overdue Invoices</div>
            <div class="stat-value">${reportData.overdueCount || 0}</div>
          </div>

          <p style="margin-top: 20px;">
            Best regards,<br>
            <strong>${organization.name}</strong>
          </p>
        </div>

        <div class="footer">
          <p>This is an automated email report. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject: `Daily Report - ${organization.name}`,
      html: emailBody,
    };

    console.log('📧 Sending daily report to:', recipientEmail);

    const info = await mailer.sendMail(mailOptions);

    console.log('✅ Daily report sent:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Send report error:', error);
    throw error;
  }
};