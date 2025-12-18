// ============================================
// FILE: server/models/WhatsAppConfig.js
// NEW FILE - WhatsApp Integration Configuration
// ============================================

import mongoose from 'mongoose';

const whatsappConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['TWILIO', 'WHATSAPP_BUSINESS', 'MESSAGEBIRD', 'GUPSHUP', 'MANUAL'],
      default: 'MANUAL',
    },
    
    // Twilio Configuration
    twilioAccountSid: String,
    twilioAuthToken: String,
    twilioWhatsAppNumber: String,
    
    // WhatsApp Business API
    businessApiToken: String,
    businessPhoneNumberId: String,
    
    // MessageBird
    messageBirdApiKey: String,
    messageBirdNumber: String,
    
    // Gupshup
    gupshupApiKey: String,
    gupshupAppName: String,
    
    // Message Templates
    templates: {
      invoiceCreated: {
        enabled: { type: Boolean, default: true },
        message: {
          type: String,
          default: 'Hi {clientName}, Invoice {invoiceNumber} for ₹{amount} has been generated. Due date: {dueDate}. View: {invoiceLink}',
        },
      },
      paymentReceived: {
        enabled: { type: Boolean, default: true },
        message: {
          type: String,
          default: 'Hi {clientName}, Payment of ₹{amount} received for Invoice {invoiceNumber}. Thank you!',
        },
      },
      paymentReminder: {
        enabled: { type: Boolean, default: true },
        message: {
          type: String,
          default: 'Hi {clientName}, Reminder: Invoice {invoiceNumber} for ₹{amount} is due on {dueDate}. Please make payment.',
        },
      },
      paymentOverdue: {
        enabled: { type: Boolean, default: true },
        message: {
          type: String,
          default: 'Hi {clientName}, Invoice {invoiceNumber} for ₹{amount} is overdue since {dueDate}. Please clear dues urgently.',
        },
      },
    },
    
    // Automation Settings
    autoSendInvoice: {
      type: Boolean,
      default: false,
    },
    autoSendPaymentConfirmation: {
      type: Boolean,
      default: false,
    },
    sendReminderBeforeDue: {
      type: Boolean,
      default: false,
    },
    reminderDaysBefore: {
      type: Number,
      default: 3,
    },
    sendOverdueReminder: {
      type: Boolean,
      default: false,
    },
    overdueReminderFrequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      default: 'WEEKLY',
    },
    
    isActive: {
      type: Boolean,
      default: false,
    },
    
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const WhatsAppConfig = mongoose.model('WhatsAppConfig', whatsappConfigSchema);

export default WhatsAppConfig;