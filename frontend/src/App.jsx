import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";
import "./App.css";

// Lazy-loaded route components for optimized bundle splitting
const LoginPage = lazy(() => import("./features/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const TellerDashboard = lazy(() => import("./features/dashboard/TellerDashboard").then(m => ({ default: m.TellerDashboard })));
const MasterDashboard = lazy(() => import("./features/dashboard/MasterDashboard"));
const AccountList = lazy(() => import("./features/accounts/AccountList").then(m => ({ default: m.AccountList })));
const LoansPage = lazy(() => import("./features/loans/LoansPage").then(m => ({ default: m.LoansPage })));
const PaymentsPage = lazy(() => import("./features/payments/PaymentsPage"));
const KycPage = lazy(() => import("./features/kyc/KycPage"));
const CompliancePage = lazy(() => import("./features/compliance/CompliancePage"));
const CustomerList = lazy(() => import("./features/customers/CustomerList").then(m => ({ default: m.CustomerList })));
const OperationsPage = lazy(() => import("./features/operations/OperationsPage").then(m => ({ default: m.OperationsPage })));
const PendingApprovalsPage = lazy(() => import("./features/approvals/PendingApprovalsPage").then(m => ({ default: m.PendingApprovalsPage })));
const TransactionsPage = lazy(() => import("./features/transactions/TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const StatementPage = lazy(() => import("./features/statements/StatementPage").then(m => ({ default: m.StatementPage })));
const AuditPage = lazy(() => import("./features/audit/AuditPage").then(m => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const PortalDashboard = lazy(() => import("./features/customer-portal/PortalDashboard").then(m => ({ default: m.PortalDashboard })));
const PortalAccounts = lazy(() => import("./features/customer-portal/PortalAccounts").then(m => ({ default: m.PortalAccounts })));
const PortalTransfer = lazy(() => import("./features/customer-portal/PortalTransfer").then(m => ({ default: m.PortalTransfer })));
const PortalTransactions = lazy(() => import("./features/customer-portal/PortalTransactions").then(m => ({ default: m.PortalTransactions })));
const PortalStatements = lazy(() => import("./features/customer-portal/PortalStatements").then(m => ({ default: m.PortalStatements })));
const PortalLoans = lazy(() => import("./features/customer-portal/PortalLoans").then(m => ({ default: m.PortalLoans })));

function RouteLoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center p-8">
      <Spinner size="lg" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
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
                  <Route path="/master" element={<MasterDashboard />} />
                  <Route path="/accounts" element={<AccountList />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/loans" element={<LoansPage />} />
                  <Route path="/loans/:id" element={<LoansPage />} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/kyc" element={<KycPage />} />
                  <Route path="/compliance" element={<CompliancePage />} />
                  <Route path="/operations" element={<OperationsPage />} />
                  <Route path="/approvals" element={<PendingApprovalsPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/statements" element={<StatementPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
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
                  <Route path="loans" element={<PortalLoans />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
