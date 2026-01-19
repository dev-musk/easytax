// ============================================
// FILE: server/services/whatsappService.js
// NEW FILE - WhatsApp Integration Service
// ============================================

import WhatsAppConfig from '../models/WhatsAppConfig.js';

class WhatsAppService {
  // Send WhatsApp message
  static async sendMessage(organizationId, phoneNumber, message) {
    try {
      const config = await WhatsAppConfig.findOne({
        organization: organizationId,
        isActive: true,
      });

      if (!config) {
        throw new Error('WhatsApp configuration not found or inactive');
      }

      // Format phone number (remove spaces, dashes, add country code if needed)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      switch (config.provider) {
        case 'TWILIO':
          return await this.sendViaTwilio(config, formattedNumber, message);
        case 'WHATSAPP_BUSINESS':
          return await this.sendViaBusinessAPI(config, formattedNumber, message);
        case 'MESSAGEBIRD':
          return await this.sendViaMessageBird(config, formattedNumber, message);
        case 'GUPSHUP':
          return await this.sendViaGupshup(config, formattedNumber, message);
        case 'MANUAL':
          return { success: true, provider: 'MANUAL', message: 'Manual sending - copy message and send via WhatsApp' };
        default:
          throw new Error('Invalid WhatsApp provider');
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  // Send invoice notification
  static async sendInvoiceNotification(invoice, client, config) {
    try {
      if (!config.templates.invoiceCreated.enabled) return null;

      const message = this.replaceTemplateVariables(
        config.templates.invoiceCreated.message,
        {
          clientName: client.companyName || client.contactPerson,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount.toLocaleString('en-IN'),
          dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
          invoiceLink: `${process.env.APP_URL || 'http://localhost:5173'}/invoices/view/${invoice._id}`,
        }
      );

      return await this.sendMessage(
        invoice.organization,
        client.phoneNumber || client.contactPerson?.phoneNumber,
        message
      );
    } catch (error) {
      console.error('Error sending invoice notification:', error);
      return null;
    }
  }

  // Send payment confirmation
  static async sendPaymentConfirmation(invoice, client, payment, config) {
    try {
      if (!config.templates.paymentReceived.enabled) return null;

      const message = this.replaceTemplateVariables(
        config.templates.paymentReceived.message,
        {
          clientName: client.companyName || client.contactPerson,
          invoiceNumber: invoice.invoiceNumber,
          amount: payment.amount.toLocaleString('en-IN'),
        }
      );

      return await this.sendMessage(
        invoice.organization,
        client.phoneNumber || client.contactPerson?.phoneNumber,
        message
      );
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      return null;
    }
  }

  // Send payment reminder
  static async sendPaymentReminder(invoice, client, config, isOverdue = false) {
    try {
      const template = isOverdue
        ? config.templates.paymentOverdue
        : config.templates.paymentReminder;

      if (!template.enabled) return null;

      const message = this.replaceTemplateVariables(template.message, {
        clientName: client.companyName || client.contactPerson,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceAmount.toLocaleString('en-IN'),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
      });

      return await this.sendMessage(
        invoice.organization,
        client.phoneNumber || client.contactPerson?.phoneNumber,
        message
      );
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return null;
    }
  }

  // Twilio integration
  static async sendViaTwilio(config, phoneNumber, message) {
    try {
      // Note: Requires twilio package: npm install twilio
      // Uncomment when twilio is installed
      /*
      const twilio = require('twilio');
      const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
      
      const result = await client.messages.create({
        from: `whatsapp:${config.twilioWhatsAppNumber}`,
        to: `whatsapp:${phoneNumber}`,
        body: message,
      });
      
      return { success: true, provider: 'TWILIO', messageId: result.sid };
      */
      
      console.log('Twilio message would be sent:', { phoneNumber, message });
      return { success: true, provider: 'TWILIO', message: 'Demo mode - Twilio not configured' };
    } catch (error) {
      throw new Error(`Twilio error: ${error.message}`);
    }
  }

  // WhatsApp Business API integration
  static async sendViaBusinessAPI(config, phoneNumber, message) {
    try {
      // Note: Requires axios and proper WhatsApp Business API setup
      /*
      const axios = require('axios');
      
      const result = await axios.post(
        `https://graph.facebook.com/v17.0/${config.businessPhoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'Authorization': `Bearer ${config.businessApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return { success: true, provider: 'WHATSAPP_BUSINESS', messageId: result.data.messages[0].id };
      */
      
      console.log('WhatsApp Business message would be sent:', { phoneNumber, message });
      return { success: true, provider: 'WHATSAPP_BUSINESS', message: 'Demo mode - Business API not configured' };
    } catch (error) {
      throw new Error(`WhatsApp Business API error: ${error.message}`);
    }
  }

  // MessageBird integration
  static async sendViaMessageBird(config, phoneNumber, message) {
    console.log('MessageBird message would be sent:', { phoneNumber, message });
    return { success: true, provider: 'MESSAGEBIRD', message: 'Demo mode - MessageBird not configured' };
  }

  // Gupshup integration
  static async sendViaGupshup(config, phoneNumber, message) {
    console.log('Gupshup message would be sent:', { phoneNumber, message });
    return { success: true, provider: 'GUPSHUP', message: 'Demo mode - Gupshup not configured' };
  }

  // Helper: Format phone number
  static formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add +91 if not present (India)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Helper: Replace template variables
  static replaceTemplateVariables(template, variables) {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return message;
  }
}

export default WhatsAppService;