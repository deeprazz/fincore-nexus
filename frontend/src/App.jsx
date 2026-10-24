import { useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
  Settings,
  TrendingUp,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import "./App.css";

const API = "http://localhost:8081/api";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Accounts", icon: Wallet },
  { label: "Customers", icon: Users },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Operations", icon: Activity },
  { label: "Statements", icon: FileText },
  { label: "KYC", icon: ShieldCheck },
  { label: "Audit", icon: Activity },
  { label: "Settings", icon: Settings },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [auth, setAuth] = useState(null);
  const [loginUsername, setLoginUsername] = useState("teller");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [customerPortal, setCustomerPortal] = useState(null);
  const [customerActivePage, setCustomerActivePage] = useState("Overview");
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [customerStatement, setCustomerStatement] = useState(null);
  const [statementFrom, setStatementFrom] = useState("");
  const [statementTo, setStatementTo] = useState("");
  const [statementBusy, setStatementBusy] = useState(false);
  const [customerDestination, setCustomerDestination] = useState("");
  const [customerTransferAmount, setCustomerTransferAmount] = useState("");
  const [customerTransferPin, setCustomerTransferPin] = useState("");
  const [customerPinCurrent, setCustomerPinCurrent] = useState("");
  const [customerPinNew, setCustomerPinNew] = useState("");
  const [customerPinConfirm, setCustomerPinConfirm] = useState("");
  const [customerPinBusy, setCustomerPinBusy] = useState(false);
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [apiLatency, setApiLatency] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [kycFilter, setKycFilter] = useState("ALL");
  const [newAccountCustomerId, setNewAccountCustomerId] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [transactions, setTransactions] = useState([]);
  const [statement, setStatement] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [operation, setOperation] = useState("DEPOSIT");
  const [operationAccountId, setOperationAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

  async function apiRequest(path, options = {}) {
    const startedAt = performance.now();
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(auth
          ? {
              Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
            }
          : {}),
        ...options.headers,
      },
    });
    setApiLatency(Math.round(performance.now() - startedAt));

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? data.message || data.error
          : typeof data === "string"
            ? data
            : null;

      throw new Error(message || `Request failed (${response.status})`);
    }

    return data;
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const candidate = {
      username: loginUsername.trim(),
      password: loginPassword,
    };
    try {
      const headers = {
        Authorization: `Basic ${btoa(`${candidate.username}:${candidate.password}`)}`,
      };
      const portalResponse = await fetch(`${API}/customer-portal/me`, {
        headers,
      });
      if (portalResponse.ok) {
        const portalData = await portalResponse.json();
        setCustomerPortal(portalData);
        setCustomerTransactions([]);
        setCustomerMessage("");
        setCustomerError("");
        if (
          portalData.kycStatus === "VERIFIED" &&
          portalData.accounts?.[0]?.id
        ) {
          const txResponse = await fetch(
            `${API}/customer-portal/transactions?accountId=${encodeURIComponent(portalData.accounts[0].id)}`,
            { headers },
          );
          if (txResponse.ok) {
            const txData = await txResponse.json();
            setCustomerTransactions(Array.isArray(txData) ? txData : []);
          }
        }
        setAuth({ ...candidate, role: "CUSTOMER" });
        setLoginPassword("");
        return;
      }
      const response = await fetch(`${API}/accounts`, { headers });
      if (!response.ok) {
        setLoginError(
          response.status === 401 || response.status === 403
            ? "Invalid credentials, or your role cannot access this page."
            : `Backend returned ${response.status}. Make sure Spring Boot is running.`,
        );
        return;
      }
      const accountData = await response.json();
      setAuth({ ...candidate, role: "TELLER" });
      setCustomerPortal(null);
      setAccounts(Array.isArray(accountData) ? accountData : []);
      const customerResponse = await fetch(`${API}/customers`, { headers });
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        setCustomers(Array.isArray(customerData) ? customerData : []);
      }
      setLoginPassword("");
    } catch {
      setLoginError(
        "Cannot connect to the backend. Start Spring Boot and PostgreSQL, then try again.",
      );
    }
  }

  async function registerCustomer(event) {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            `Registration failed (${response.status})`,
        );
      setLoginUsername(registerEmail.trim());
      setLoginPassword("");
      setRegisterPassword("");
      setAuthMode("login");
      setLoginError(
        "Registration successful. Your KYC is PENDING. Sign in to check your status.",
      );
    } catch (e) {
      setLoginError(e.message || "Registration failed.");
    }
  }

  function logout() {
    setAuth(null);
    setCustomerPortal(null);
    setCustomerTransactions([]);
    setCustomerDestination("");
    setCustomerTransferAmount("");
    setCustomerTransferPin("");
    setCustomerPinCurrent("");
    setCustomerPinNew("");
    setCustomerPinConfirm("");
    setCustomerMessage("");
    setCustomerError("");
    setAccounts([]);
    setCustomers([]);
    setTransactions([]);
    setStatement(null);
    setAuditLogs([]);
    setActivePage("Dashboard");
  }

  async function loadAccounts() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/accounts");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(
        `${e.message}. Check Spring Boot and the frontend CORS configuration.`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers({ showLoading = true } = {}) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(
        `${e.message}. Check that CustomerController allows requests from http://localhost:5173.`,
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function updateCustomerKyc(customerId, status) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const updated = await apiRequest(
        `/customers/${encodeURIComponent(customerId)}/kyc?status=${encodeURIComponent(status)}`,
        { method: "PATCH" },
      );
      setSuccess(
        `${updated?.name || "Customer"} KYC status updated to ${status}.`,
      );
      await loadCustomers({ showLoading: false });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!newAccountCustomerId) {
      setError("Select a customer for this account.");
      return;
    }

    const openingBalance = Number(initialBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setError("Initial balance must be zero or greater.");
      return;
    }

    if (Math.round(openingBalance * 100) !== openingBalance * 100) {
      setError("Initial balance can have at most two decimal places.");
      return;
    }

    setLoading(true);
    try {
      const created = await apiRequest("/accounts", {
        method: "POST",
        body: JSON.stringify({
          customerId: newAccountCustomerId,
          initialBalance: openingBalance,
        }),
      });

      setInitialBalance("0");
      setSuccess(
        `Account ${created?.accountNumber || ""} created successfully for the selected customer.`.trim(),
      );

      const [accountData, customerData] = await Promise.all([
        apiRequest("/accounts"),
        apiRequest("/customers"),
      ]);
      setAccounts(Array.isArray(accountData) ? accountData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = customerName.trim();
    const email = customerEmail.trim();

    if (!name || !email) {
      setError("Enter both the customer's name and email.");
      return;
    }

    setLoading(true);
    try {
      const created = await apiRequest("/customers", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      setCustomerName("");
      setCustomerEmail("");
      setSuccess(`Customer ${created?.name || name} registered successfully.`);
      await loadCustomers({ showLoading: false });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiRequest("/audit");
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openPage(page) {
    setActivePage(page);
    setSidebarOpen(false);
    setError("");
    setSuccess("");

    if (page === "Accounts" || page === "Operations" || page === "Statements") {
      await loadAccounts();
    }

    if (page === "Accounts") {
      await loadCustomers();
    }

    if (page === "Customers" || page === "KYC") {
      await loadCustomers();
    }

    if (page === "Audit") {
      await loadAuditLogs();
    }
  }

  async function loadTransactions(id = accountId) {
    if (!id) {
      setError("Please select or enter an account ID.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(
        `/transactions/account/${encodeURIComponent(id)}`,
      );

      setTransactions(Array.isArray(data) ? data : []);
      setAccountId(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatement(id = accountId) {
    setError("");
    setSuccess("");

    if (!id) {
      setError("Please select an account.");
      return;
    }

    if (!from || !to) {
      setError("Please select both the start date and end date.");
      return;
    }

    if (from > to) {
      setError("The start date cannot be after the end date.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({ from, to });
      const data = await apiRequest(
        `/accounts/${encodeURIComponent(id)}/statement?${params.toString()}`,
      );

      setStatement(data);
      setAccountId(id);
      setSuccess("Account statement generated successfully.");
    } catch (e) {
      setStatement(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitOperation(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!operationAccountId) {
      setError("Please select an account.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (Math.round(numericAmount * 100) !== numericAmount * 100) {
      setError("Amount can have at most two decimal places.");
      return;
    }

    if (
      operation === "TRANSFER" &&
      (!destinationAccountId || destinationAccountId === operationAccountId)
    ) {
      setError("Choose a different destination account.");
      return;
    }

    let path;
    let body;

    if (operation === "DEPOSIT") {
      path = `/accounts/${operationAccountId}/deposit`;
      body = { amount: numericAmount };
    } else if (operation === "WITHDRAWAL") {
      path = `/accounts/${operationAccountId}/withdraw`;
      body = { amount: numericAmount };
    } else {
      path = "/accounts/transfer";
      body = {
        fromAccountId: operationAccountId,
        toAccountId: destinationAccountId,
        amount: numericAmount,
      };
    }

    setLoading(true);

    try {
      const result = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccess(
        operation === "TRANSFER"
          ? result || "Transfer completed successfully."
          : `${operation === "DEPOSIT" ? "Deposit" : "Withdrawal"} completed successfully.`,
      );

      setAmount("");

      // Refresh account balances after the successful operation.
      const updatedAccounts = await apiRequest("/accounts");
      setAccounts(Array.isArray(updatedAccounts) ? updatedAccounts : []);

      if (operation !== "TRANSFER") {
        setAccountId(operationAccountId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCustomerPortal() {
    if (!auth || auth.role !== "CUSTOMER") return;
    setCustomerBusy(true);
    setCustomerError("");
    try {
      const portalData = await apiRequest("/customer-portal/me");
      setCustomerPortal(portalData);
      const selectedAccount = portalData.accounts?.[0];
      if (selectedAccount?.id && portalData.kycStatus === "VERIFIED") {
        const txData = await apiRequest(
          `/customer-portal/transactions?accountId=${encodeURIComponent(selectedAccount.id)}`,
        );
        setCustomerTransactions(Array.isArray(txData) ? txData : []);
      } else {
        setCustomerTransactions([]);
      }
    } catch (e) {
      setCustomerError(e.message || "Could not refresh your banking details.");
    } finally {
      setCustomerBusy(false);
    }
  }

  async function generateCustomerStatement(event) {
    event.preventDefault();
    setCustomerError("");
    setCustomerMessage("");
    const selectedAccount = customerPortal?.accounts?.[0];
    if (!selectedAccount?.id) {
      setCustomerError("No eligible account is available for a statement.");
      return;
    }
    if (statementFrom && statementTo && statementFrom > statementTo) {
      setCustomerError("The start date must be on or before the end date.");
      return;
    }
    setStatementBusy(true);
    try {
      const params = new URLSearchParams();
      if (statementFrom) params.set("from", statementFrom);
      if (statementTo) params.set("to", statementTo);
      const query = params.toString();
      const result = await apiRequest(
        `/customer-portal/accounts/${encodeURIComponent(selectedAccount.id)}/statement${query ? `?${query}` : ""}`,
      );
      setCustomerStatement(result);
      setCustomerMessage("Statement generated successfully.");
    } catch (e) {
      setCustomerError(e.message || "Could not generate your statement.");
    } finally {
      setStatementBusy(false);
    }
  }

  async function saveCustomerPin(event) {
    event.preventDefault();
    setCustomerError("");
    setCustomerMessage("");
    if (!/^\d{4}$/.test(customerPinNew)) {
      setCustomerError("Choose a PIN containing exactly 4 digits.");
      return;
    }
    if (customerPinNew !== customerPinConfirm) {
      setCustomerError("The new PIN entries do not match.");
      return;
    }
    if (
      customerPortal?.hasTransactionPin &&
      !/^\d{4}$/.test(customerPinCurrent)
    ) {
      setCustomerError("Enter your current 4-digit transaction PIN.");
      return;
    }
    setCustomerPinBusy(true);
    try {
      const result = await apiRequest("/customer-portal/pin", {
        method: "POST",
        body: JSON.stringify({
          currentPin: customerPortal?.hasTransactionPin
            ? customerPinCurrent
            : null,
          pin: customerPinNew,
        }),
      });
      setCustomerPortal((old) =>
        old ? { ...old, hasTransactionPin: true } : old,
      );
      setCustomerPinCurrent("");
      setCustomerPinNew("");
      setCustomerPinConfirm("");
      setCustomerMessage(
        result?.message || "Transaction PIN saved successfully.",
      );
    } catch (e) {
      setCustomerError(e.message || "Could not save transaction PIN.");
    } finally {
      setCustomerPinBusy(false);
    }
  }

  async function submitCustomerTransfer(event) {
    event.preventDefault();
    setCustomerError("");
    setCustomerMessage("");
    const sourceAccount = customerPortal?.accounts?.[0];
    const value = Number(customerTransferAmount);
    if (!sourceAccount?.id) {
      setCustomerError("No eligible account is available for transfers.");
      return;
    }
    if (!customerPortal?.hasTransactionPin) {
      setCustomerError(
        "Set your 4-digit transaction PIN before transferring money.",
      );
      return;
    }
    if (!/^\d{4}$/.test(customerTransferPin)) {
      setCustomerError("Enter your 4-digit transaction PIN.");
      return;
    }
    if (!customerDestination.trim()) {
      setCustomerError("Enter the recipient account number.");
      return;
    }
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      Math.round(value * 100) !== value * 100
    ) {
      setCustomerError(
        "Enter a valid amount greater than zero, with at most two decimal places.",
      );
      return;
    }
    setCustomerBusy(true);
    try {
      const result = await apiRequest("/customer-portal/transfer", {
        method: "POST",
        body: JSON.stringify({
          sourceAccountId: sourceAccount.id,
          destinationAccountNumber: customerDestination.trim(),
          amount: value,
          transactionPin: customerTransferPin,
        }),
      });
      setCustomerMessage(result?.message || "Transfer completed successfully.");
      setCustomerDestination("");
      setCustomerTransferAmount("");
      setCustomerTransferPin("");
      await refreshCustomerPortal();
    } catch (e) {
      setCustomerError(e.message || "Transfer failed.");
    } finally {
      setCustomerBusy(false);
    }
  }

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );

  const pendingKycCount = customers.filter(
    (customer) => String(customer.kycStatus ?? "").toUpperCase() === "PENDING",
  ).length;

  const visibleKycCustomers = customers.filter((customer) => {
    const status = String(customer.kycStatus ?? "UNKNOWN").toUpperCase();
    return kycFilter === "ALL" || status === kycFilter;
  });

  if (!auth) {
    return (
      <div className="login-shell">
        <form
          className="login-card"
          onSubmit={authMode === "register" ? registerCustomer : login}
        >
          <div className="brand-mark login-mark">
            <Activity size={24} />
          </div>
          <div className="brand-name">FinCore Nexus</div>
          <p className="login-subtitle">
            {authMode === "register"
              ? "Create your customer profile"
              : "Customer or Teller sign in"}
          </p>
          {loginError && <div className="alert-error">{loginError}</div>}
          {authMode === "register" ? (
            <>
              <label>
                Full name
                <input
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Password (at least 8 characters)
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <button className="primary-button login-submit" type="submit">
                Register as customer
              </button>
              <p className="login-help">
                Already registered?{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthMode("login");
                    setLoginError("");
                  }}
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <label>
                Email / teller username
                <input
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </label>
              <button className="primary-button login-submit" type="submit">
                Sign in securely
              </button>
              <p className="login-help">
                New customer?{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthMode("register");
                    setLoginError("");
                  }}
                >
                  Register here
                </button>
              </p>
              <p className="login-help">
                Demo teller: <strong>teller</strong> /{" "}
                <strong>Teller@123</strong>
              </p>
            </>
          )}
          <p className="login-warning">
            New customers start with KYC Pending. Teller approval is required
            before banking access.
          </p>
        </form>
      </div>
    );
  }

  if (auth.role === "CUSTOMER") {
    const customerAccounts = customerPortal?.accounts || [];
    const canBank = customerPortal?.kycStatus === "VERIFIED";
    const primaryAccount = customerAccounts[0];
    const totalBalance = customerAccounts.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0,
    );
    const customerNav = [
      { label: "Overview", icon: LayoutDashboard },
      { label: "My accounts", icon: Wallet },
      { label: "Transfer money", icon: ArrowLeftRight },
      { label: "Transactions", icon: Activity },
      { label: "Statements", icon: FileText },
    ];
    const selectCustomerPage = (page) => {
      setCustomerActivePage(page);
      setCustomerMessage("");
      setCustomerError("");
    };

    return (
      <div className="customer-app-shell">
        <header className="customer-topbar">
          <div className="customer-brand">
            <div className="customer-brand-mark">
              <Activity size={20} />
            </div>
            <div>
              <strong>FinCore</strong>
              <span>YOUR EVERYDAY BANKING</span>
            </div>
          </div>
          <div className="customer-topbar-right">
            <span className="customer-secure-indicator">
              <span /> Secure connection
            </span>
            <div className="customer-user-chip">
              <span className="customer-avatar">
                {(customerPortal?.name || auth.username || "C")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
              <span>{customerPortal?.name || auth.username}</span>
            </div>
            <button
              className="secondary-button customer-logout-top"
              onClick={logout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="customer-workspace">
          <aside className="customer-sidebar">
            <div className="customer-sidebar-label">YOUR ACCOUNT</div>
            <nav aria-label="Customer navigation">
              {customerNav.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`customer-nav-item ${customerActivePage === label ? "active" : ""}`}
                  aria-current={
                    customerActivePage === label ? "page" : undefined
                  }
                  onClick={() => selectCustomerPage(label)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {customerActivePage === label && (
                    <span className="customer-nav-dot" />
                  )}
                </button>
              ))}
            </nav>
            <div className="customer-sidebar-bottom">
              <ShieldCheck size={18} />
              <div>
                <strong>Your money matters</strong>
                <span>
                  Keep your details private. Sign out when you’re done.
                </span>
              </div>
            </div>
          </aside>

          <main className="customer-main-content">
            <div className="customer-page-heading">
              <div>
                <div className="customer-eyebrow">PERSONAL BANKING</div>
                <h1>
                  {customerActivePage === "Overview"
                    ? `Hi, ${(customerPortal?.name || "there").split(" ")[0]}`
                    : customerActivePage}
                </h1>
                <p>
                  {
                    {
                      Overview: "Here’s a quick look at your money.",
                      "My accounts": "Your accounts and available balances.",
                      "Transfer money":
                        "Send money to another FinCore account.",
                      Transactions: "A record of money moving in and out.",
                      Statements: "Choose a date range to review your account.",
                    }[customerActivePage]
                  }
                </p>
              </div>
              <button
                className="secondary-button customer-refresh"
                type="button"
                onClick={refreshCustomerPortal}
                disabled={customerBusy}
              >
                <RefreshCw size={14} />
                {customerBusy ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {(customerError || customerMessage) && (
              <div
                className={`customer-feedback ${customerError ? "is-error" : "is-success"}`}
                role={customerError ? "alert" : "status"}
              >
                <span className="customer-feedback-mark">
                  {customerError ? "!" : "✓"}
                </span>
                <div>
                  <strong>
                    {customerError
                      ? "Something needs your attention"
                      : "All done"}
                  </strong>
                  <p>{customerError || customerMessage}</p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss message"
                  onClick={() => {
                    setCustomerError("");
                    setCustomerMessage("");
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {customerActivePage === "Overview" && (
              <>
                <section className="customer-welcome-strip">
                  <div>
                    <span className="customer-welcome-label">
                      YOUR ACCOUNT AT A GLANCE
                    </span>
                    <h2>Your money, in one place.</h2>
                    <p>
                      Check your balance, make a transfer, or catch up on recent
                      activity.
                    </p>
                  </div>
                  <div className="customer-kyc-summary">
                    <span
                      className={`customer-status-pill ${canBank ? "verified" : "pending"}`}
                    >
                      {customerPortal?.kycStatus || "PENDING"}
                    </span>
                    <span>Verification status</span>
                  </div>
                </section>
                <section
                  className="customer-metric-grid"
                  aria-label="Account summary"
                >
                  <article className="customer-metric-card customer-metric-primary">
                    <div className="customer-metric-top">
                      <span>Available balance</span>
                      <Wallet size={18} />
                    </div>
                    <strong>{money(totalBalance)}</strong>
                    <small>
                      Across {customerAccounts.length} account
                      {customerAccounts.length === 1 ? "" : "s"}
                    </small>
                  </article>
                  <article className="customer-metric-card">
                    <div className="customer-metric-top">
                      <span>My accounts</span>
                      <LayoutDashboard size={18} />
                    </div>
                    <strong>{customerAccounts.length}</strong>
                    <small>Linked to your profile</small>
                  </article>
                  <article className="customer-metric-card">
                    <div className="customer-metric-top">
                      <span>Account status</span>
                      <ShieldCheck size={18} />
                    </div>
                    <strong className="customer-metric-status">
                      {primaryAccount?.status ||
                        (canBank ? "Active" : "Pending")}
                    </strong>
                    <small>
                      {canBank
                        ? "Banking access is ready"
                        : "Waiting for Teller approval"}
                    </small>
                  </article>
                </section>
                {!canBank && (
                  <section className="customer-section customer-kyc-pending">
                    <div className="customer-panel-heading">
                      <h3>Your account is being checked</h3>
                      <span className="customer-status-pill pending">
                        PENDING
                      </span>
                    </div>
                    <p>
                      Your registration is in place. A Teller needs to verify
                      your details before transfers and other banking services
                      become available. You can refresh this page later to check
                      for updates.
                    </p>
                  </section>
                )}
                {canBank && (
                  <section className="customer-section customer-overview-activity">
                    <div className="customer-section-heading">
                      <div>
                        <span className="customer-section-kicker">
                          RECENT ACTIVITY
                        </span>
                        <h3>Latest transactions</h3>
                      </div>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => selectCustomerPage("Transactions")}
                      >
                        See all
                      </button>
                    </div>
                    {customerTransactions.length ? (
                      <div className="customer-transactions-wrap">
                        <table className="customer-transactions-table">
                          <thead>
                            <tr>
                              <th>Details</th>
                              <th>Amount</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerTransactions.slice(0, 4).map((tx) => (
                              <tr key={tx.id}>
                                <td>
                                  {String(tx.transactionType || "").replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </td>
                                <td>{money(tx.amount)}</td>
                                <td>
                                  {tx.createdAt
                                    ? new Date(
                                        tx.createdAt,
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="customer-empty-state">
                        <strong>No activity just yet</strong>
                        <p>
                          Your transactions will show up here when you start
                          using your account.
                        </p>
                      </div>
                    )}
                  </section>
                )}
                <footer className="customer-footer">
                  <span>FinCore · Personal banking</span>
                  <span>
                    <ShieldCheck size={13} /> Your account, kept private
                  </span>
                </footer>
              </>
            )}

            {customerActivePage === "My accounts" && (
              <>
                {!canBank ? (
                  <section className="customer-section customer-kyc-pending">
                    <h3>Account access is pending</h3>
                    <p>
                      Your account details will be available after Teller
                      verification.
                    </p>
                  </section>
                ) : (
                  <section className="customer-section">
                    <div className="customer-section-heading">
                      <div>
                        <span className="customer-section-kicker">
                          YOUR MONEY
                        </span>
                        <h3>My accounts</h3>
                      </div>
                      <span className="customer-muted">
                        {customerAccounts.length} linked
                      </span>
                    </div>
                    {customerAccounts.length ? (
                      <div className="customer-account-grid">
                        {customerAccounts.map((account) => (
                          <article
                            className="customer-account-card"
                            key={account.id}
                          >
                            <div className="customer-account-card-top">
                              <span className="customer-account-icon">
                                <Wallet size={18} />
                              </span>
                              <span className="customer-status-pill verified">
                                {account.status || "ACTIVE"}
                              </span>
                            </div>
                            <span className="customer-muted">
                              ACCOUNT NUMBER
                            </span>
                            <strong>{account.accountNumber}</strong>
                            <span className="customer-muted">
                              Available balance
                            </span>
                            <strong className="customer-balance">
                              {money(account.balance)}
                            </strong>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="customer-muted">
                        No bank account has been opened yet. Please contact your
                        Teller.
                      </p>
                    )}
                  </section>
                )}
              </>
            )}

            {customerActivePage === "Transfer money" && (
              <>
                {!canBank ? (
                  <section className="customer-section customer-kyc-pending">
                    <h3>Transfers aren’t available yet</h3>
                    <p>
                      Once your KYC is approved, you’ll be able to send money
                      from here.
                    </p>
                  </section>
                ) : (
                  <>
                    <section className="customer-section">
                      <div className="customer-section-heading">
                        <div>
                          <span className="customer-section-kicker">
                            PAYMENTS
                          </span>
                          <h3>Send money</h3>
                        </div>
                        <span className="customer-muted">
                          Review details before sending
                        </span>
                      </div>
                      <p className="customer-muted">
                        Double-check the recipient account number and amount
                        before you confirm.
                      </p>
                      <form
                        className="customer-transfer-form"
                        onSubmit={submitCustomerTransfer}
                      >
                        <label>
                          From account
                          <select value={primaryAccount?.id || ""} disabled>
                            {customerAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.accountNumber} ·{" "}
                                {money(account.balance)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Recipient account number
                          <input
                            value={customerDestination}
                            onChange={(e) =>
                              setCustomerDestination(e.target.value)
                            }
                            placeholder="e.g. 1000-0000-0002"
                            required
                            maxLength={30}
                          />
                        </label>
                        <label>
                          Amount (INR)
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            value={customerTransferAmount}
                            onChange={(e) =>
                              setCustomerTransferAmount(e.target.value)
                            }
                            placeholder="0.00"
                            required
                          />
                        </label>
                        <label>
                          4-digit transaction PIN
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="current-password"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            value={customerTransferPin}
                            onChange={(e) =>
                              setCustomerTransferPin(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            placeholder={
                              customerPortal?.hasTransactionPin
                                ? "Enter transaction PIN"
                                : "Set your PIN below first"
                            }
                            required
                            disabled={!customerPortal?.hasTransactionPin}
                          />
                        </label>
                        <button
                          className="primary-button customer-transfer-submit"
                          type="submit"
                          disabled={customerBusy}
                        >
                          {customerBusy ? "Sending…" : "Send money"}
                          <ArrowLeftRight size={15} />
                        </button>
                      </form>
                    </section>
                    <section className="customer-section">
                      <div className="customer-section-heading">
                        <div>
                          <span className="customer-section-kicker">
                            ACCOUNT SECURITY
                          </span>
                          <h3>
                            {customerPortal?.hasTransactionPin
                              ? "Change your transaction PIN"
                              : "Set up your transaction PIN"}
                          </h3>
                        </div>
                        <span
                          className={`customer-status-pill ${customerPortal?.hasTransactionPin ? "verified" : "pending"}`}
                        >
                          {customerPortal?.hasTransactionPin
                            ? "PIN ACTIVE"
                            : "SETUP REQUIRED"}
                        </span>
                      </div>
                      <p className="customer-muted">
                        Your 4-digit PIN is used to approve transfers. It is
                        checked securely by the server and is never shown back
                        to you.
                      </p>
                      <form
                        className="customer-transfer-form"
                        onSubmit={saveCustomerPin}
                      >
                        {customerPortal?.hasTransactionPin && (
                          <label>
                            Current PIN
                            <input
                              type="password"
                              inputMode="numeric"
                              autoComplete="current-password"
                              pattern="[0-9]{4}"
                              maxLength={4}
                              value={customerPinCurrent}
                              onChange={(e) =>
                                setCustomerPinCurrent(
                                  e.target.value.replace(/\D/g, "").slice(0, 4),
                                )
                              }
                              required
                            />
                          </label>
                        )}
                        <label>
                          New PIN
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            value={customerPinNew}
                            onChange={(e) =>
                              setCustomerPinNew(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            placeholder="4 digits"
                            required
                          />
                        </label>
                        <label>
                          Confirm new PIN
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            value={customerPinConfirm}
                            onChange={(e) =>
                              setCustomerPinConfirm(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            placeholder="Repeat PIN"
                            required
                          />
                        </label>
                        <button
                          className="primary-button customer-transfer-submit"
                          type="submit"
                          disabled={customerPinBusy}
                        >
                          {customerPinBusy
                            ? "Saving…"
                            : customerPortal?.hasTransactionPin
                              ? "Update PIN"
                              : "Save PIN"}
                          <ShieldCheck size={15} />
                        </button>
                      </form>
                    </section>
                  </>
                )}
              </>
            )}

            {customerActivePage === "Transactions" && (
              <section className="customer-section">
                <div className="customer-section-heading">
                  <div>
                    <span className="customer-section-kicker">
                      ACCOUNT ACTIVITY
                    </span>
                    <h3>Transactions</h3>
                  </div>
                  <span className="customer-muted">Latest activity</span>
                </div>
                {!canBank ? (
                  <p className="customer-muted">
                    Transaction history will be available after your account is
                    verified.
                  </p>
                ) : customerTransactions.length ? (
                  <div className="customer-transactions-wrap">
                    <table className="customer-transactions-table">
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Amount</th>
                          <th>Balance after</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              {String(tx.transactionType || "").replaceAll(
                                "_",
                                " ",
                              )}
                            </td>
                            <td>{money(tx.amount)}</td>
                            <td>{money(tx.balanceAfter)}</td>
                            <td>
                              {tx.createdAt
                                ? new Date(tx.createdAt).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="customer-empty-state">
                    <span>
                      <Activity size={20} />
                    </span>
                    <strong>No transactions yet</strong>
                    <p>
                      Your banking activity will appear here when you make your
                      first transaction.
                    </p>
                  </div>
                )}
              </section>
            )}

            {customerActivePage === "Statements" && (
              <section className="customer-section">
                <div className="customer-section-heading">
                  <div>
                    <span className="customer-section-kicker">
                      PAPERWORK, WITHOUT THE PAPER
                    </span>
                    <h3>Account statement</h3>
                  </div>
                </div>
                {!canBank ? (
                  <p className="customer-muted">
                    Statements will be available after your account is verified.
                  </p>
                ) : (
                  <>
                    <p className="customer-muted">
                      Pick a date range if you want to narrow things down. Leave
                      dates blank to use the available history.
                    </p>
                    <form
                      className="customer-transfer-form customer-statement-form"
                      onSubmit={generateCustomerStatement}
                    >
                      <label>
                        From date
                        <input
                          type="date"
                          value={statementFrom}
                          onChange={(e) => setStatementFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        To date
                        <input
                          type="date"
                          value={statementTo}
                          onChange={(e) => setStatementTo(e.target.value)}
                          min={statementFrom || undefined}
                        />
                      </label>
                      <button
                        className="primary-button customer-transfer-submit"
                        type="submit"
                        disabled={statementBusy}
                      >
                        {statementBusy ? "Generating…" : "Generate statement"}
                        <FileText size={15} />
                      </button>
                    </form>
                    {customerStatement && (
                      <div className="customer-statement-result">
                        <div className="customer-statement-metrics">
                          <div>
                            <span>Opening balance</span>
                            <strong>
                              {money(customerStatement.openingBalance)}
                            </strong>
                          </div>
                          <div>
                            <span>Total deposits</span>
                            <strong>
                              {money(customerStatement.totalDeposits)}
                            </strong>
                          </div>
                          <div>
                            <span>Total withdrawals</span>
                            <strong>
                              {money(customerStatement.totalWithdrawals)}
                            </strong>
                          </div>
                          <div>
                            <span>Closing balance</span>
                            <strong>
                              {money(customerStatement.closingBalance)}
                            </strong>
                          </div>
                        </div>
                        <p className="customer-muted">
                          {customerStatement.totalTransactions ??
                            customerStatement.transactions?.length ??
                            0}{" "}
                          transactions in this period
                        </p>
                        {customerStatement.transactions?.length ? (
                          <div className="customer-transactions-wrap">
                            <table className="customer-transactions-table">
                              <thead>
                                <tr>
                                  <th>Transaction</th>
                                  <th>Amount</th>
                                  <th>Balance after</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerStatement.transactions.map((tx) => (
                                  <tr key={tx.id}>
                                    <td>
                                      {String(
                                        tx.transactionType || "",
                                      ).replaceAll("_", " ")}
                                    </td>
                                    <td>{money(tx.amount)}</td>
                                    <td>{money(tx.balanceAfter)}</td>
                                    <td>
                                      {tx.createdAt
                                        ? new Date(
                                            tx.createdAt,
                                          ).toLocaleString()
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="customer-empty-state">
                            <strong>No transactions in this date range</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
            <footer className="customer-footer">
              <span>FinCore · Personal banking</span>
              <span>
                <ShieldCheck size={13} /> Your account, kept private
              </span>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-button mobile-menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </button>

        <div className="brand">
          <div className="brand-mark">
            <Activity size={22} />
          </div>
          <div>
            <div className="brand-name">FinCore Nexus</div>
            <div className="brand-subtitle">DIGITAL BANKING PLATFORM</div>
          </div>
        </div>

        <div className="milestone">
          Milestone 1: Account &amp; Customer Services
        </div>

        <div className="topbar-right">
          <span className="status-dot" />
          <span>{auth.username} · Teller</span>
          <button className="secondary-button" onClick={logout} type="button">
            Sign out
          </button>
          <div className="avatar">
            {auth.username.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="workspace">
        {sidebarOpen && (
          <button
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <div className="sidebar-label">WORKSPACE</div>

          <nav>
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${activePage === label ? "active" : ""}`}
                onClick={() => openPage(label)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {activePage === label && <span className="active-indicator" />}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="secure-badge">
              <ShieldCheck size={18} />
              Secure workspace
            </div>
            <div className="version">FINCORE NEXUS · MILESTONE 1</div>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                CORE BANKING / {activePage.toUpperCase()}
              </div>
              <h1>
                {activePage === "Dashboard"
                  ? "Core Banking Operations"
                  : activePage}
              </h1>
              <p>Manage accounts and banking operations from one workspace.</p>
            </div>

            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>
          </div>

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}
          {loading && <div className="loading-line">Processing request…</div>}

          {activePage === "Dashboard" && (
            <>
              <div className="metrics-grid">
                <Metric
                  icon={Wallet}
                  label="Accounts"
                  value={accounts.length}
                  hint="Loaded account records"
                />
                <Metric
                  icon={Users}
                  label="Customers"
                  value={customers.length}
                  hint="Registered customer records"
                />
                <Metric
                  icon={ArrowLeftRight}
                  label="Transactions Loaded"
                  value={transactions.length}
                  hint="Currently loaded history"
                />
                <Metric
                  icon={TrendingUp}
                  label="Combined Balance"
                  value={money(totalBalance)}
                  hint="Sum of loaded accounts"
                />
                <Metric
                  icon={Activity}
                  label="Last API Latency"
                  value={apiLatency == null ? "—" : `${apiLatency} ms`}
                  hint="Measured browser-to-API round trip"
                />
              </div>

              <section className="panel overview-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Account Service — Core Banking</h2>
                    <p>Live account and transaction data from your backend</p>
                  </div>
                  <span className="live-badge">
                    <span />
                    API CONNECTED
                  </span>
                </div>

                <div className="quick-actions">
                  <button
                    className="primary-button"
                    onClick={async () => {
                      await loadAccounts();
                    }}
                  >
                    <Wallet size={16} />
                    Load Accounts
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => openPage("Operations")}
                  >
                    <ArrowLeftRight size={16} />
                    Banking Operations
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => openPage("Customers")}
                  >
                    <Users size={16} />
                    Manage Customers
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => openPage("Statements")}
                  >
                    <FileText size={16} />
                    View Statement
                  </button>
                </div>

                <div className="account-lookup">
                  <label htmlFor="dashboard-account-id">Account ID</label>
                  <div className="lookup-row">
                    <input
                      id="dashboard-account-id"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="Enter account UUID"
                    />
                    <button
                      className="primary-button"
                      onClick={() => {
                        setActivePage("Transactions");
                        loadTransactions(accountId);
                      }}
                    >
                      <Search size={16} />
                      Find Transactions
                    </button>
                  </div>
                  <span className="field-hint">
                    Use the account UUID, not the formatted account number.
                  </span>
                </div>
              </section>
            </>
          )}

          {activePage === "Accounts" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Create Bank Account</h2>
                    <p>
                      Choose a registered customer and set the opening balance
                    </p>
                  </div>
                </div>
                <form
                  className="operation-form customer-form"
                  onSubmit={createAccount}
                >
                  <label>
                    Account owner
                    <select
                      required
                      value={newAccountCustomerId}
                      onChange={(e) => setNewAccountCustomerId(e.target.value)}
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} — {customer.email} (
                          {customer.kycStatus})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Initial balance (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="Enter opening balance"
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading || !customers.length}
                  >
                    <Wallet size={16} />
                    {loading ? "Creating account…" : "Create Account"}
                  </button>
                  {!customers.length && (
                    <span className="field-hint">
                      Register a customer first to create an account.
                    </span>
                  )}
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Accounts</h2>
                    <p>Accounts retrieved from Spring Boot</p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={loadAccounts}
                    disabled={loading}
                  >
                    Refresh
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Account Number</th>
                        <th>Account ID</th>
                        <th>Balance</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id}>
                          <td className="account-number">
                            {account.accountNumber}
                          </td>
                          <td className="muted-cell">{account.id}</td>
                          <td>{money(account.balance)}</td>
                          <td className="action-cell">
                            <button
                              onClick={() => {
                                setAccountId(account.id);
                                setActivePage("Transactions");
                                loadTransactions(account.id);
                              }}
                            >
                              History
                            </button>
                            <button
                              onClick={() => {
                                setAccountId(account.id);
                                setStatement(null);
                                setActivePage("Statements");
                                setError("");
                                setSuccess("");
                              }}
                            >
                              Statement
                            </button>
                          </td>
                        </tr>
                      ))}

                      {!accounts.length && !loading && (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            No accounts loaded. Click Refresh.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activePage === "Customers" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Register Customer</h2>
                    <p>Create a customer profile in the Customer Service</p>
                  </div>
                  <span className="live-badge">
                    <span /> CUSTOMER API
                  </span>
                </div>

                <form
                  className="operation-form customer-form"
                  onSubmit={createCustomer}
                >
                  <label>
                    Full name
                    <input
                      type="text"
                      maxLength={100}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer's full name"
                      required
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      required
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading}
                  >
                    <UserPlus size={16} />
                    {loading ? "Registering…" : "Register Customer"}
                  </button>
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Customer Directory</h2>
                    <p>
                      {customers.length} customer record(s) returned by the
                      backend
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => loadCustomers()}
                    disabled={loading}
                  >
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>
                <CustomerTable customers={customers} />
              </section>
            </>
          )}

          {activePage === "KYC" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>KYC Overview</h2>
                  <p>View KYC statuses currently stored for each customer</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => loadCustomers()}
                  disabled={loading}
                >
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              <div className="metrics-grid kyc-metrics">
                <Metric
                  icon={Users}
                  label="Total Customers"
                  value={customers.length}
                />
                <Metric
                  icon={ShieldCheck}
                  label="Pending KYC"
                  value={pendingKycCount}
                />
                <Metric
                  icon={ShieldCheck}
                  label="Verified KYC"
                  value={
                    customers.filter(
                      (c) =>
                        String(c.kycStatus ?? "").toUpperCase() === "VERIFIED",
                    ).length
                  }
                />
              </div>

              <div className="statement-filters">
                <label>
                  Filter by KYC status
                  <select
                    value={kycFilter}
                    onChange={(e) => setKycFilter(e.target.value)}
                  >
                    <option value="ALL">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              </div>

              <CustomerTable
                customers={visibleKycCustomers}
                showKycActions
                onKycAction={updateCustomerKyc}
                disabled={loading}
              />
              <p className="field-hint kyc-note">
                This page displays the status returned by your backend. It does
                not approve or reject KYC because no verification endpoint has
                been provided yet.
              </p>
            </section>
          )}

          {activePage === "Operations" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Banking Operations</h2>
                  <p>Deposit, withdraw, or transfer funds between accounts.</p>
                </div>
              </div>

              <div className="operation-tabs">
                {[
                  ["DEPOSIT", "Deposit"],
                  ["WITHDRAWAL", "Withdraw"],
                  ["TRANSFER", "Transfer"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`operation-tab ${
                      operation === value ? "selected" : ""
                    }`}
                    onClick={() => {
                      setOperation(value);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form className="operation-form" onSubmit={submitOperation}>
                <label>
                  {operation === "TRANSFER" ? "From account" : "Account"}
                  <select
                    required
                    value={operationAccountId}
                    onChange={(e) => setOperationAccountId(e.target.value)}
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber} — {money(account.balance)}
                      </option>
                    ))}
                  </select>
                </label>

                {operation === "TRANSFER" && (
                  <label>
                    To account
                    <select
                      required
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                    >
                      <option value="">Select destination</option>
                      {accounts
                        .filter((account) => account.id !== operationAccountId)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountNumber} — {money(account.balance)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}

                <label>
                  Amount (₹)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Processing…"
                    : `Confirm ${
                        operation === "WITHDRAWAL"
                          ? "withdrawal"
                          : operation.toLowerCase()
                      }`}
                </button>
              </form>
            </section>
          )}

          {activePage === "Transactions" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Transaction History</h2>
                  <p>Deposits, withdrawals and transfers for an account</p>
                </div>
              </div>

              <div className="lookup-row transaction-lookup">
                <input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Account UUID"
                />
                <button
                  className="primary-button"
                  onClick={() => loadTransactions()}
                  disabled={loading}
                >
                  Load History
                </button>
              </div>

              <TransactionTable transactions={transactions} money={money} />
            </section>
          )}

          {activePage === "Statements" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Account Statement</h2>
                  <p>Choose an account and optional date range</p>
                </div>
              </div>

              <div className="statement-filters">
                <label>
                  Account
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.accountNumber}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  From date
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>

                <label>
                  To date
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>

                <button
                  className="primary-button"
                  onClick={() => loadStatement()}
                  disabled={loading}
                >
                  Generate Statement
                </button>
              </div>

              {statement && (
                <>
                  <div className="statement-metrics">
                    <Metric
                      label="Opening Balance"
                      value={money(statement.openingBalance)}
                    />
                    <Metric
                      label="Deposits"
                      value={money(statement.totalDeposits)}
                    />
                    <Metric
                      label="Withdrawals"
                      value={money(statement.totalWithdrawals)}
                    />
                    <Metric
                      label="Closing Balance"
                      value={money(statement.closingBalance)}
                    />
                  </div>

                  <p className="table-caption">
                    {statement.totalTransactions} transactions in this period
                  </p>

                  <TransactionTable
                    transactions={statement.transactions ?? []}
                    money={money}
                  />
                </>
              )}
            </section>
          )}

          {activePage === "Audit" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Audit Trail</h2>
                  <p>
                    Recent successful account, transaction, customer and KYC
                    actions (latest 100).
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={loadAuditLogs}
                  disabled={loading}
                >
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Entity ID</th>
                      <th>Actor</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td>{log.action}</td>
                        <td>{log.entityType}</td>
                        <td className="muted-cell">{log.entityId || "—"}</td>
                        <td>{log.actor}</td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                    {!auditLogs.length && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No audit events yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {![
            "Dashboard",
            "Accounts",
            "Customers",
            "KYC",
            "Operations",
            "Transactions",
            "Statements",
            "Audit",
          ].includes(activePage) && (
            <section className="panel coming-soon">
              <div className="coming-icon">
                <Settings size={28} />
              </div>
              <h2>{activePage}</h2>
              <p>This section will be implemented in a later step.</p>
              <span>Milestone 1 · Account &amp; Customer Services</span>
            </section>
          )}

          <footer className="footer">
            <span>
              FinCore Nexus <span className="footer-separator">/</span> Core
              Banking Services
            </span>
            <span>
              <span className="status-dot" /> Backend: localhost:8081
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <section className="metric-card">
      {Icon && (
        <div className="metric-icon">
          <Icon size={19} />
        </div>
      )}
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </section>
  );
}

function CustomerTable({
  customers,
  showKycActions = false,
  onKycAction,
  disabled = false,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Email</th>
            <th>Customer ID</th>
            <th>KYC Status</th>
            <th>Created At</th>
            {showKycActions && <th>Decision</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const status = String(
              customer.kycStatus ?? "UNKNOWN",
            ).toUpperCase();
            const pending = status === "PENDING";
            return (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td className="muted-cell">{customer.id}</td>
                <td>
                  <span className={`kyc-status kyc-${status.toLowerCase()}`}>
                    {status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleString()
                    : "—"}
                </td>
                {showKycActions && (
                  <td className="action-cell">
                    {pending ? (
                      <>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "VERIFIED")}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="muted-cell">Decision recorded</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!customers.length && (
            <tr>
              <td colSpan={showKycActions ? "6" : "5"} className="empty-state">
                No customers to display. Register a customer or refresh the
                list.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TransactionTable({ transactions, money }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance After</th>
            <th>Reference ID</th>
            <th>Date &amp; Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <span
                  className={`transaction-type ${String(
                    transaction.transactionType,
                  ).toLowerCase()}`}
                >
                  {transaction.transactionType}
                </span>
              </td>
              <td>{money(transaction.amount)}</td>
              <td>{money(transaction.balanceAfter)}</td>
              <td className="muted-cell">{transaction.referenceId ?? "—"}</td>
              <td>
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}

          {!transactions.length && (
            <tr>
              <td colSpan="5" className="empty-state">
                No transactions to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
