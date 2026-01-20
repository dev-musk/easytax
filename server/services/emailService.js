// ============================================
// FILE: server/services/emailService.js
// ✅ FEATURES #27 & #31: Email Service (FIXED - proper ES module import)
// ============================================


import pkg from 'nodemailer';
const { createTransport } = pkg;
import { generateInvoiceReminderEmail, generateDailyReportEmail } from '../utils/emailTemplate.js';

// ✅ Create transporter with better error handling
const createTransporter = () => {
  try {
    // Remove spaces from app password
    const appPassword = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
    
    const transporter = createTransport({
      service: 'gmail', // ✅ Using 'service' instead of manual config
      auth: {
        user: process.env.SMTP_USER,
        pass: appPassword,
      },
      // ✅ FIX: Allow self-signed certificates in development
      tls: {
        rejectUnauthorized: false
      }
    });

    return transporter;

  } catch (error) {
    console.error('❌ Error creating email transporter:', error.message);
    throw error;
  }
};

// ✅ FEATURE #27: Send Invoice Reminder
export const sendInvoiceReminder = async (invoice, organization, client) => {
  try {
    console.log('📧 Attempting to send invoice reminder...');
    console.log(`   Invoice: ${invoice.invoiceNumber}`);
    console.log(`   To: ${client.email}`);

    const transporter = createTransporter();
    const emailHTML = generateInvoiceReminderEmail(invoice, organization, client);

    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    
    let subject = `Payment Reminder: Invoice ${invoice.invoiceNumber}`;
    if (daysOverdue > 0) {
      subject = `⚠️ OVERDUE: Payment Required for Invoice ${invoice.invoiceNumber}`;
    } else if (daysOverdue >= -3 && daysOverdue < 0) {
      subject = `⏰ Payment Due Soon: Invoice ${invoice.invoiceNumber}`;
    }

    const mailOptions = {
      from: `"${organization.name}" <${process.env.SMTP_USER}>`,
      to: client.email,
      cc: organization.email || undefined,
      subject: subject,
      html: emailHTML,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Invoice reminder sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${client.email}`);
    
    return {
      success: true,
      messageId: info.messageId,
      sentTo: client.email,
      sentAt: new Date(),
    };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('   Details:', error);
    throw error;
  }
};

// ✅ FEATURE #31: Send Daily Report
export const sendDailyReport = async (reportData, organization, recipientEmail) => {
  try {
    console.log('📊 Generating daily report email...');
    console.log(`   To: ${recipientEmail}`);

    const transporter = createTransporter();
    const emailHTML = generateDailyReportEmail(reportData, organization);

    const mailOptions = {
      from: `"${organization.name} Reports" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `📊 Daily Business Report - ${new Date(reportData.date).toLocaleDateString('en-IN')}`,
      html: emailHTML,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Daily report sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${recipientEmail}`);
    
    return {
      success: true,
      messageId: info.messageId,
      sentTo: recipientEmail,
      sentAt: new Date(),
    };

  } catch (error) {
    console.error('❌ Daily report sending failed:', error.message);
    console.error('   Details:', error);
    throw error;
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    console.log('🔍 Testing email configuration...');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    
    const transporter = createTransporter();
    
    console.log('   Verifying connection...');
    await transporter.verify();
    
    console.log('✅ Email server is ready to send messages!');
    return { 
      success: true, 
      message: 'Email configuration is valid and server is ready',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER
      }
    };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    console.error('   Error details:', error);
    throw new Error('Email configuration invalid: ' + error.message);
  }
};