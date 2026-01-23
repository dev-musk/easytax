// ============================================
// FILE: server/server.js
// CORRECTED - Added Phase 2 Routes
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import invoiceRoutes from './routes/invoices.js';
import dashboardRoutes from './routes/dashboard.js';
import productRoutes from './routes/products.js';
import tdsConfigRoutes from './routes/tdsconfig.js';
import recurringInvoiceRoutes from './routes/recurringInvoices.js';
import whatsappRoutes from './routes/whatsapp.js';
import analyticsRoutes from './routes/analytics.js';
import organizationRoutes from './routes/organization.js';
import quotationRoutes from './routes/quotations.js';
import hsnRoutes from './routes/hsn.js';
import reminderRoutes from './routes/reminders.js';
import { initSchedulers } from './services/scheduler.js';


// PHASE 2 ROUTES - NEW IMPORTS
import paymentRoutes from './routes/payments.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import gstReportRoutes from './routes/gstReports.js';
import creditDebitNoteRoutes from './routes/creditDebitNotes.js';
import reportRoutes from './routes/reports.js';
import auditLogRoutes from './routes/auditLogs.js';
import threeWayMatchingRoutes from './routes/threeWayMatching.js';
import smartCategorizationRoutes from './routes/smartCategorization.js';
import ocrRoutes from './routes/ocr.js';
import grnRoutes from './routes/grns.js';
import userRoutes from './routes/userRoutes.js';
import purchaseInvoiceRoutes from './routes/purchaseInvoices.js';



import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ✅ FEATURES #27 & #31: Initialize email schedulers
initSchedulers();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ROUTES - Phase 1 + Phase 2
// ============================================

// Phase 1 Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Phase 2 Routes - TDS & Recurring
app.use('/api/tdsconfig', tdsConfigRoutes);
app.use('/api/recurring-invoices', recurringInvoiceRoutes);

// Phase 2 Routes - Payments & Reports (NEW)
app.use('/api/payments', paymentRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/gst-reports', gstReportRoutes);
app.use('/api/credit-debit-notes', creditDebitNoteRoutes);

// Phase 2 Routes - Analytics
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/hsn', hsnRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/three-way-matching', threeWayMatchingRoutes);
app.use('/api/smart-categorization', smartCategorizationRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/grns', grnRoutes);
app.use('/api/users', userRoutes);
app.use('/api/purchase-invoices', purchaseInvoiceRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Phase 1 Routes: Auth, Organization, Clients, Products, Invoices, Dashboard, WhatsApp`);
});