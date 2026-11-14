import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { TellerDashboard } from "./features/dashboard/TellerDashboard";
import { AccountList } from "./features/accounts/AccountList";
import { LoansPage } from "./features/loans/LoansPage";
import PaymentsPage from "./features/payments/PaymentsPage";
import KycPage from "./features/kyc/KycPage";
import CompliancePage from "./features/compliance/CompliancePage";
import { CustomerList } from "./features/customers/CustomerList";
import { KycStatusControl } from "./features/customers/KycStatusControl";
import { OperationsPage } from "./features/operations/OperationsPage";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { StatementPage } from "./features/statements/StatementPage";
import { AuditPage } from "./features/audit/AuditPage";
import { PortalDashboard } from "./features/customer-portal/PortalDashboard";
import { PortalAccounts } from "./features/customer-portal/PortalAccounts";
import { PortalTransfer } from "./features/customer-portal/PortalTransfer";
import { PortalTransactions } from "./features/customer-portal/PortalTransactions";
import { PortalStatements } from "./features/customer-portal/PortalStatements";
import "./App.css";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Teller / Staff Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["TELLER", "MANAGER", "ADMIN"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<TellerDashboard />} />
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/loans" element={<LoansPage />} />
              <Route path="/loans/:id" element={<LoansPage />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/kyc" element={<KycPage />} />
              <Route path="/compliance" element={<CompliancePage />} />
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/statements" element={<StatementPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </Route>

            {/* Customer Portal Routes */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<PortalDashboard />} />
              <Route path="accounts" element={<PortalAccounts />} />
              <Route path="transfer" element={<PortalTransfer />} />
              <Route path="transactions" element={<PortalTransactions />} />
              <Route path="statements" element={<PortalStatements />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
