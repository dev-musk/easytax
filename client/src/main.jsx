// ============================================
// FILE: client/src/main.jsx
// ✅ FEATURE #29: Sales Tree Structure
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
import PublicInvoiceView from "./pages/PublicInvoiceView";
import AuditTrail from "./pages/AuditTrail";

// Settings
import OrganizationSettings from "./pages/OrganizationSettings";
import TDSSettings from "./pages/TDSSettings";
import WhatsAppSettings from "./pages/WhatsAppSettings";

// Recurring Invoices
import RecurringInvoices from "./pages/RecurringInvoices";
import AddEditRecurringInvoice from "./pages/AddEditRecurringInvoice";

// Reports - Phase 1
import Reports from "./pages/Reports";
import OutstandingReports from "./pages/OutstandingReports";
import AgeingReport from "./pages/AgeingReport";

// PHASE 2 - NEW IMPORTS
import Payments from "./pages/Payments";
import PurchaseOrders from "./pages/PurchaseOrders";
import AddEditPO from "./pages/AddEditPO";
import ViewPO from "./pages/ViewPO";
import GSTReports from "./pages/GSTReports";
import CreditDebitNotes from "./pages/CreditDebitNotes";

// Analytics
import Analytics from "./pages/Analytics";
import ClientProfitability from "./pages/ClientProfitability";

import Quotations from "./pages/Quotations";
import AddEditQuotation from "./pages/AddEditQuotation";
import ViewQuotation from "./pages/ViewQuotation";
import HSNManagement from "./pages/HSNManagement";
import MultiGSTIN from "./pages/MultiGSTIN";
import InventoryDashboard from "./pages/InventoryDashboard";
import GRNList from "./pages/GRNList";
import AddEditGRN from "./pages/AddEditGRN";
import GRNView from './pages/GRNView';

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

        <Route
          path="/public/invoice/:shareToken"
          element={<PublicInvoiceView />}
        />

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
        {/* PRODUCTS / ITEMS */}
        {/* ============================================ */}
        <Route
          path="/items"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/items/add"
          element={
            <PrivateRoute>
              <AddEditProduct />
            </PrivateRoute>
          }
        />
        <Route
          path="/items/edit/:id"
          element={
            <PrivateRoute>
              <AddEditProduct />
            </PrivateRoute>
          }
        />

        <Route
          path="/hsn-management"
          element={
            <PrivateRoute>
              <HSNManagement />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* SALES TREE STRUCTURE - Feature #29 */}
        {/* ============================================ */}

        {/* Quotations */}
        <Route
          path="/sales/quotations"
          element={
            <PrivateRoute>
              <Quotations />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/quotations/add"
          element={
            <PrivateRoute>
              <AddEditQuotation />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/quotations/edit/:id"
          element={
            <PrivateRoute>
              <AddEditQuotation />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/quotations/view/:id"
          element={
            <PrivateRoute>
              <ViewQuotation />
            </PrivateRoute>
          }
        />

        {/* Tax Invoice */}
        <Route
          path="/sales/tax-invoice"
          element={
            <PrivateRoute>
              <Invoices type="TAX_INVOICE" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/tax-invoice/add"
          element={
            <PrivateRoute>
              <AddEditInvoice invoiceType="TAX_INVOICE" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/tax-invoice/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/tax-invoice/view/:id"
          element={
            <PrivateRoute>
              <InvoiceView />
            </PrivateRoute>
          }
        />

        {/* Pro-Forma Invoice */}
        <Route
          path="/sales/proforma"
          element={
            <PrivateRoute>
              <Invoices type="PROFORMA" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/proforma/add"
          element={
            <PrivateRoute>
              <AddEditInvoice invoiceType="PROFORMA" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/proforma/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/proforma/view/:id"
          element={
            <PrivateRoute>
              <InvoiceView />
            </PrivateRoute>
          }
        />

        {/* Recurring Invoices */}
        <Route
          path="/sales/recurring"
          element={
            <PrivateRoute>
              <RecurringInvoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/recurring/add"
          element={
            <PrivateRoute>
              <AddEditRecurringInvoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/recurring/edit/:id"
          element={
            <PrivateRoute>
              <AddEditRecurringInvoice />
            </PrivateRoute>
          }
        />
        {/* ============================================ */}
        <Route
          path="/audit-trail"
          element={
            <PrivateRoute>
              <AuditTrail />
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <InventoryDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/grns"
          element={
            <PrivateRoute>
              <GRNList />
            </PrivateRoute>
          }
        />
        <Route path="/grns/add" element={<AddEditGRN />} />
        <Route path="/grns/edit/:id" element={<AddEditGRN />} />
        <Route path="/grns/view/:id" element={<GRNView />} />
        {/* Delivery Challan */}
        <Route
          path="/sales/delivery-challan"
          element={
            <PrivateRoute>
              <Invoices type="DELIVERY_CHALLAN" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/delivery-challan/add"
          element={
            <PrivateRoute>
              <AddEditInvoice invoiceType="DELIVERY_CHALLAN" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/delivery-challan/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />

        {/* Credit Note */}
        <Route
          path="/sales/credit-note"
          element={
            <PrivateRoute>
              <Invoices type="CREDIT_NOTE" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/credit-note/add"
          element={
            <PrivateRoute>
              <AddEditInvoice invoiceType="CREDIT_NOTE" />
            </PrivateRoute>
          }
        />

        <Route
          path="/sales/credit-note/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />

        {/* Debit Note */}
        <Route
          path="/sales/debit-note"
          element={
            <PrivateRoute>
              <Invoices type="DEBIT_NOTE" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/debit-note/add"
          element={
            <PrivateRoute>
              <AddEditInvoice invoiceType="DEBIT_NOTE" />
            </PrivateRoute>
          }
        />
        <Route
          path="/sales/debit-note/edit/:id"
          element={
            <PrivateRoute>
              <AddEditInvoice />
            </PrivateRoute>
          }
        />

        {/* ============================================ */}
        {/* BACKWARD COMPATIBILITY ROUTES */}
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
        <Route
          path="/quotations/view/:id"
          element={
            <PrivateRoute>
              <ViewQuotation />
            </PrivateRoute>
          }
        />

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

        {/* Credit/Debit Notes (Legacy Route) */}
        {/* <Route
          path="/credit-debit-notes"
          element={
            <PrivateRoute>
              <CreditDebitNotes />
            </PrivateRoute>
          }
        /> */}

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
        {/* REPORTS */}
        {/* ============================================ */}
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
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
        {/* ============================================ */}
        {/* FEATURE #16: PURCHASE ORDERS */}
        {/* ============================================ */}
        <Route
          path="/purchase-orders"
          element={
            <PrivateRoute>
              <PurchaseOrders />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/add"
          element={
            <PrivateRoute>
              <AddEditPO />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/edit/:id"
          element={
            <PrivateRoute>
              <AddEditPO />
            </PrivateRoute>
          }
        />
        <Route
          path="/purchase-orders/view/:id"
          element={
            <PrivateRoute>
              <ViewPO />
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
        {/* ============================================ */}
        {/* MULTI-GSTIN MANAGEMENT */}
        {/* ============================================ */}
        <Route
          path="/multi-gstin"
          element={
            <PrivateRoute>
              <MultiGSTIN />
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
