// ============================================
// FILE: client/src/main.jsx
// CORRECTED - Added Phase 2 Routes
// ============================================

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Auth
import Login from "./pages/Login";

// Dashboard
import Dashboard from "./pages/Dashboard";

// Clients
import Clients from "./pages/Clients";
import AddEditClient from "./pages/AddEditClient";

// Products
import Products from "./pages/Products";
import AddEditProduct from "./pages/AddEditProduct";

// Invoices
import Invoices from "./pages/Invoices";
import AddEditInvoice from "./pages/AddEditInvoice";
import InvoiceView from "./pages/InvoiceView";

// Settings
import OrganizationSettings from "./pages/OrganizationSettings";
import TDSSettings from "./pages/TDSSettings";
import WhatsAppSettings from "./pages/WhatsAppSettings";

// Recurring Invoices
import RecurringInvoices from "./pages/RecurringInvoices";
import AddEditRecurringInvoice from "./pages/AddEditRecurringInvoice";

// Reports - Phase 1
import OutstandingReports from "./pages/OutstandingReports";
import AgeingReport from "./pages/AgeingReport";

// PHASE 2 - NEW IMPORTS
import Payments from "./pages/Payments";
import GSTReports from "./pages/GSTReports";
import CreditDebitNotes from "./pages/CreditDebitNotes";

// Analytics
import Analytics from "./pages/Analytics";
import ClientProfitability from "./pages/ClientProfitability";

import Quotations from "./pages/Quotations";
import AddEditQuotation from "./pages/AddEditQuotation";
import ViewQuotation from "./pages/ViewQuotation";

import { useAuthStore } from "./store/authStore";

function PrivateRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  return user ? children : <Navigate to="/login" />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ============================================ */}
        {/* PUBLIC ROUTES */}
        {/* ============================================ */}
        <Route path="/login" element={<Login />} />

        {/* ============================================ */}
        {/* DASHBOARD */}
        {/* ============================================ */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* CLIENTS */}
        {/* ============================================ */}
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

        {/* ============================================ */}
        {/* PRODUCTS */}
        {/* ============================================ */}
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

        {/* ============================================ */}
        {/* INVOICES */}
        {/* ============================================ */}
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
        <Route
          path="/invoices/view/:id"
          element={
            <PrivateRoute>
              <InvoiceView />
            </PrivateRoute>
          }
        />

        {/* QUOTATIONS */}
        <Route
          path="/quotations"
          element={
            <PrivateRoute>
              <Quotations />
            </PrivateRoute>
          }
        />
        <Route
          path="/quotations/add"
          element={
            <PrivateRoute>
              <AddEditQuotation />
            </PrivateRoute>
          }
        />
        <Route
          path="/quotations/edit/:id"
          element={
            <PrivateRoute>
              <AddEditQuotation />
            </PrivateRoute>
          }
        />

        <Route path="/quotations/view/:id" element={<ViewQuotation />} />

        {/* ============================================ */}
        {/* PHASE 2: PAYMENTS */}
        {/* ============================================ */}
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <Payments />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* RECURRING INVOICES */}
        {/* ============================================ */}
        <Route
          path="/recurring-invoices"
          element={
            <PrivateRoute>
              <RecurringInvoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/recurring-invoices/add"
          element={
            <PrivateRoute>
              <AddEditRecurringInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/recurring-invoices/edit/:id"
          element={
            <PrivateRoute>
              <AddEditRecurringInvoice />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* PHASE 2: CREDIT & DEBIT NOTES */}
        {/* ============================================ */}
        <Route
          path="/credit-debit-notes"
          element={
            <PrivateRoute>
              <CreditDebitNotes />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* REPORTS */}
        {/* ============================================ */}
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

        {/* PHASE 2: GST REPORTS */}
        <Route
          path="/gst-reports"
          element={
            <PrivateRoute>
              <GSTReports />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* ANALYTICS */}
        {/* ============================================ */}
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

        {/* ============================================ */}
        {/* SETTINGS */}
        {/* ============================================ */}
        <Route
          path="/settings/organization"
          element={
            <PrivateRoute>
              <OrganizationSettings />
            </PrivateRoute>
          }
        />
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

        {/* ============================================ */}
        {/* DEFAULT & CATCH-ALL */}
        {/* ============================================ */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
