// ============================================
// FILE: client/src/pages/WhatsAppSettings.jsx
// NEW FILE - WhatsApp Configuration & Testing
// ============================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { MessageSquare, Send, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [testMessage, setTestMessage] = useState({
    phoneNumber: '',
    message: '',
  });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/api/whatsapp/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/whatsapp/config', config);
      alert('WhatsApp configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.phoneNumber || !testMessage.message) {
      alert('Please enter phone number and message');
      return;
    }

    try {
      const response = await api.post('/api/whatsapp/test', testMessage);
      setTestResult({ success: true, data: response.data });
      alert('Test message sent successfully!');
    } catch (error) {
      console.error('Error sending test:', error);
      setTestResult({ success: false, error: error.message });
      alert('Failed to send test message');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
          <p className="text-gray-600 text-sm mt-1">
            Configure WhatsApp integration for automated messaging
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">WhatsApp Integration</p>
              <p className="text-sm text-blue-700 mt-1">
                Send invoices, payment confirmations, and reminders directly via WhatsApp.
                Choose from multiple providers or use manual mode.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Provider
              </label>
              <select
                value={config?.provider || 'MANUAL'}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MANUAL">Manual (Copy & Paste)</option>
                <option value="TWILIO">Twilio</option>
                <option value="WHATSAPP_BUSINESS">WhatsApp Business API</option>
                <option value="MESSAGEBIRD">MessageBird</option>
                <option value="GUPSHUP">Gupshup</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your WhatsApp messaging provider
              </p>
            </div>

            {config?.provider === 'TWILIO' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Twilio Configuration</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={config?.twilioAccountSid || ''}
                    onChange={(e) =>
                      setConfig({ ...config, twilioAccountSid: e.target.value })
                    }
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={config?.twilioAuthToken || ''}
                    onChange={(e) =>
                      setConfig({ ...config, twilioAuthToken: e.target.value })
                    }
                    placeholder="Your auth token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={config?.twilioWhatsAppNumber || ''}
                    onChange={(e) =>
                      setConfig({ ...config, twilioWhatsAppNumber: e.target.value })
                    }
                    placeholder="+14155238886"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {config?.provider === 'MANUAL' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Manual Mode:</strong> Messages will be prepared for you to copy and
                  send via WhatsApp manually. No API configuration needed.
                </p>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config?.isActive || false}
                  onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable WhatsApp Integration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Templates</h2>

          <div className="space-y-6">
            {/* Invoice Created */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Invoice Created Message
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config?.templates?.invoiceCreated?.enabled || false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        templates: {
                          ...config.templates,
                          invoiceCreated: {
                            ...config.templates?.invoiceCreated,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </label>
              </div>
              <textarea
                rows={3}
                value={config?.templates?.invoiceCreated?.message || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    templates: {
                      ...config.templates,
                      invoiceCreated: {
                        ...config.templates?.invoiceCreated,
                        message: e.target.value,
                      },
                    },
                  })
                }
                placeholder="Hi {clientName}, Invoice {invoiceNumber} for ₹{amount}..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variables: {'{clientName}'}, {'{invoiceNumber}'}, {'{amount}'}, {'{dueDate}'},{' '}
                {'{invoiceLink}'}
              </p>
            </div>

            {/* Payment Received */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Payment Received Message
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config?.templates?.paymentReceived?.enabled || false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        templates: {
                          ...config.templates,
                          paymentReceived: {
                            ...config.templates?.paymentReceived,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={config?.templates?.paymentReceived?.message || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    templates: {
                      ...config.templates,
                      paymentReceived: {
                        ...config.templates?.paymentReceived,
                        message: e.target.value,
                      },
                    },
                  })
                }
                placeholder="Hi {clientName}, Payment of ₹{amount} received..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Payment Reminder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Payment Reminder</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config?.templates?.paymentReminder?.enabled || false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        templates: {
                          ...config.templates,
                          paymentReminder: {
                            ...config.templates?.paymentReminder,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={config?.templates?.paymentReminder?.message || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    templates: {
                      ...config.templates,
                      paymentReminder: {
                        ...config.templates?.paymentReminder,
                        message: e.target.value,
                      },
                    },
                  })
                }
                placeholder="Hi {clientName}, Reminder: Invoice {invoiceNumber}..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Overdue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Overdue Notice</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config?.templates?.paymentOverdue?.enabled || false}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        templates: {
                          ...config.templates,
                          paymentOverdue: {
                            ...config.templates?.paymentOverdue,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Enabled</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={config?.templates?.paymentOverdue?.message || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    templates: {
                      ...config.templates,
                      paymentOverdue: {
                        ...config.templates?.paymentOverdue,
                        message: e.target.value,
                      },
                    },
                  })
                }
                placeholder="Hi {clientName}, Invoice {invoiceNumber} is overdue..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config?.autoSendInvoice || false}
                onChange={(e) => setConfig({ ...config, autoSendInvoice: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Auto-send invoice on creation
                </span>
                <p className="text-xs text-gray-500">
                  Automatically send WhatsApp message when invoice is created
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config?.autoSendPaymentConfirmation || false}
                onChange={(e) =>
                  setConfig({ ...config, autoSendPaymentConfirmation: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Auto-send payment confirmation
                </span>
                <p className="text-xs text-gray-500">
                  Automatically send confirmation when payment is recorded
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config?.sendReminderBeforeDue || false}
                onChange={(e) =>
                  setConfig({ ...config, sendReminderBeforeDue: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Send reminder before due date
                </span>
                <p className="text-xs text-gray-500">Send reminder few days before due date</p>
              </div>
            </label>

            {config?.sendReminderBeforeDue && (
              <div className="ml-7">
                <label className="block text-sm text-gray-700 mb-1">Days before due date</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config?.reminderDaysBefore || 3}
                  onChange={(e) =>
                    setConfig({ ...config, reminderDaysBefore: parseInt(e.target.value) })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config?.sendOverdueReminder || false}
                onChange={(e) => setConfig({ ...config, sendOverdueReminder: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Send overdue reminders
                </span>
                <p className="text-xs text-gray-500">
                  Automatically send reminders for overdue invoices
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Test Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Message</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (with country code)
              </label>
              <input
                type="text"
                value={testMessage.phoneNumber}
                onChange={(e) =>
                  setTestMessage({ ...testMessage, phoneNumber: e.target.value })
                }
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                rows={3}
                value={testMessage.message}
                onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                placeholder="Test message to send..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleTest}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Test Message
            </button>

            {testResult && (
              <div
                className={`p-4 rounded-lg ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Message sent!</p>
                      <p className="text-xs text-green-700 mt-1">
                        {testResult.data?.message || 'Test message sent successfully'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Failed to send</p>
                      <p className="text-xs text-red-700 mt-1">{testResult.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </Layout>
  );
}