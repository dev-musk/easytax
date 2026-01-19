// ============================================
// FILE: server/services/scheduler.js
// ✅ FEATURES #27 & #31: Auto Reminder & Daily Report Scheduler
// ============================================

import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import Organization from '../models/Organization.js';
import Client from '../models/Client.js';
import { sendInvoiceReminder, sendDailyReport } from './emailService.js';
import { generateDailyReport } from './reportGenerator.js';

// ✅ FEATURE #27: Check and send invoice reminders
const checkAndSendReminders = async () => {
  try {
    console.log('🔔 Checking for invoices that need reminders...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all organizations
    const organizations = await Organization.find();

    for (const org of organizations) {
      // Find invoices that need reminders:
      // 1. Due today
      // 2. 3 days overdue
      // 3. 7 days overdue
      
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const invoicesToRemind = await Invoice.find({
        organization: org._id,
        status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        balanceAmount: { $gt: 0 },
        $or: [
          // Due today
          { 
            dueDate: { 
              $gte: today, 
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
            } 
          },
          // 3 days overdue
          { 
            dueDate: { 
              $gte: threeDaysAgo, 
              $lt: new Date(threeDaysAgo.getTime() + 24 * 60 * 60 * 1000) 
            } 
          },
          // 7 days overdue
          { 
            dueDate: { 
              $gte: sevenDaysAgo, 
              $lt: new Date(sevenDaysAgo.getTime() + 24 * 60 * 60 * 1000) 
            } 
          },
        ],
      }).populate('client');

      console.log(`   Found ${invoicesToRemind.length} invoices to remind for ${org.name}`);

      for (const invoice of invoicesToRemind) {
        if (!invoice.client || !invoice.client.email) {
          console.log(`   ⚠️ Skipping ${invoice.invoiceNumber} - no client email`);
          continue;
        }

        // Check if reminder was already sent today
        const lastReminder = invoice.remindersSent?.[invoice.remindersSent.length - 1];
        const lastReminderDate = lastReminder ? new Date(lastReminder.sentAt) : null;
        
        if (lastReminderDate && 
            lastReminderDate.toDateString() === today.toDateString()) {
          console.log(`   ⏭️ Skipping ${invoice.invoiceNumber} - already reminded today`);
          continue;
        }

        try {
          const result = await sendInvoiceReminder(invoice, org, invoice.client);
          
          // Track reminder
          if (!invoice.remindersSent) {
            invoice.remindersSent = [];
          }
          invoice.remindersSent.push({
            sentAt: new Date(),
            sentTo: invoice.client.email,
            type: 'AUTO',
          });
          await invoice.save();

          console.log(`   ✅ Reminder sent for ${invoice.invoiceNumber} to ${invoice.client.email}`);

        } catch (error) {
          console.error(`   ❌ Failed to send reminder for ${invoice.invoiceNumber}:`, error.message);
        }
      }
    }

    console.log('✅ Reminder check complete');

  } catch (error) {
    console.error('❌ Error in checkAndSendReminders:', error);
  }
};

// ✅ FEATURE #31: Send daily reports
const sendDailyReports = async () => {
  try {
    console.log('📊 Generating and sending daily reports...');

    const organizations = await Organization.find();

    for (const org of organizations) {
      try {
        // Generate report
        const reportData = await generateDailyReport(org._id);

        // Get owner email (or use organization email)
        const recipientEmail = org.ownerEmail || org.email || process.env.SMTP_USER;

        if (!recipientEmail) {
          console.log(`   ⚠️ Skipping ${org.name} - no recipient email configured`);
          continue;
        }

        // Send report
        await sendDailyReport(reportData, org, recipientEmail);

        console.log(`   ✅ Daily report sent to ${recipientEmail} for ${org.name}`);

      } catch (error) {
        console.error(`   ❌ Failed to send daily report for ${org.name}:`, error.message);
      }
    }

    console.log('✅ Daily reports complete');

  } catch (error) {
    console.error('❌ Error in sendDailyReports:', error);
  }
};

// Initialize schedulers
export const initSchedulers = () => {
  console.log('🚀 Initializing email schedulers...');

  // ✅ FEATURE #27: Check for reminders every day at 9 AM
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ Running scheduled reminder check (9:00 AM)');
    checkAndSendReminders();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // ✅ FEATURE #31: Send daily reports every day at 9 PM
  cron.schedule('0 21 * * *', () => {
    console.log('⏰ Running daily report generation (9:00 PM)');
    sendDailyReports();
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Schedulers initialized:');
  console.log('   - Invoice reminders: Daily at 9:00 AM IST');
  console.log('   - Daily reports: Daily at 9:00 PM IST');
};

// Manual trigger functions (for testing or manual execution)
export const triggerRemindersNow = async () => {
  console.log('🔔 Manually triggering reminder check...');
  await checkAndSendReminders();
};

export const triggerDailyReportNow = async () => {
  console.log('📊 Manually triggering daily report...');
  await sendDailyReports();
};