// ============================================
// FILE: client/src/main.jsx
// UPDATE - Add InvoiceView and OutstandingReports routes
// ============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import AddEditClient from './pages/AddEditClient';
import Products from './pages/Products';
import AddEditProduct from './pages/AddEditProduct';
import Invoices from './pages/Invoices';
import AddEditInvoice from './pages/AddEditInvoice';
import InvoiceView from './pages/InvoiceView';
import OutstandingReports from './pages/OutstandingReports';
import AgeingReport from './pages/AgeingReport';
import TDSSettings from './pages/TDSSettings';
import RecurringInvoices from './pages/RecurringInvoices';
import WhatsAppSettings from './pages/WhatsAppSettings';
import Analytics from './pages/Analytics';
import ClientProfitability from './pages/ClientProfitability';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  return user ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Clients Routes */}
        <Route
          path="/clients"
          element={
            <PrivateRoute>
              <Clients />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/add"
          element={
            <PrivateRoute>
              <AddEditClient />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/edit/:id"
          element={
            <PrivateRoute>
              <AddEditClient />
            </PrivateRoute>
          }
        />

        {/* Products Routes */}
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/add"
          element={
            <PrivateRoute>
              <AddEditProduct />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/edit/:id"
          element={
            <PrivateRoute>
              <AddEditProduct />
            </PrivateRoute>
          }
        />

        {/* Invoices Routes */}
        <Route
          path="/invoices"
          element={
            <PrivateRoute>
              <Invoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices/add"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />
        
        {/* NEW: Invoice View Route - For viewing and recording payments */}
        <Route
          path="/invoices/view/:id"
          element={
            <PrivateRoute>
              <InvoiceView />
            </PrivateRoute>
          }
        />

        {/* Settings Routes */}
        <Route
          path="/settings/tds"
          element={
            <PrivateRoute>
              <TDSSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/whatsapp"
          element={
            <PrivateRoute>
              <WhatsAppSettings />
            </PrivateRoute>
          }
        />

        {/* NEW: Reports Routes */}
        <Route
          path="/reports/outstanding"
          element={
            <PrivateRoute>
              <OutstandingReports />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports/ageing"
          element={
            <PrivateRoute>
              <AgeingReport />
            </PrivateRoute>
          }
        />

        {/* Recurring Invoices Routes */}
        <Route
          path="/recurring-invoices"
          element={
            <PrivateRoute>
              <RecurringInvoices />
            </PrivateRoute>
          }
        />

        {/* Analytics Routes */}
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics/client-profitability"
          element={
            <PrivateRoute>
              <ClientProfitability />
            </PrivateRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);