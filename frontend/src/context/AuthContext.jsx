import React, { createContext, useContext, useState, useEffect } from "react";
import Keycloak from "keycloak-js";
import { API_BASE_URL } from "../utils/constants";
import { setLatencyListener } from "../api/client";
import { subscribeToAccountChanges } from "../utils/syncChannel";

const AuthContext = createContext(null);

const isKeycloakMode = typeof window !== "undefined" && import.meta.env?.VITE_AUTH_MODE === "keycloak";
let keycloakInstance = null;
if (isKeycloakMode) {
  try {
    keycloakInstance = new Keycloak({
      url: import.meta.env?.VITE_KEYCLOAK_URL || "http://localhost:8089",
      realm: import.meta.env?.VITE_KEYCLOAK_REALM || "fincore-nexus",
      clientId: import.meta.env?.VITE_KEYCLOAK_CLIENT_ID || "fincore-frontend",
    });
  } catch (e) {
    console.warn("Keycloak instantiation skipped:", e);
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = sessionStorage.getItem("fincore_auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [customerPortal, setCustomerPortal] = useState(null);
  const [apiLatency, setApiLatency] = useState(null);
  const [keycloakReady, setKeycloakReady] = useState(!isKeycloakMode);

  useEffect(() => {
    if (!isKeycloakMode || !keycloakInstance) {
      setKeycloakReady(true);
      return;
    }

    keycloakInstance
      .init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        setKeycloakReady(true);
        if (authenticated) {
          const roles = keycloakInstance.tokenParsed?.realm_access?.roles || [];
          const primaryRole = roles.includes("ADMIN")
            ? "ADMIN"
            : roles.includes("MANAGER")
            ? "MANAGER"
            : roles.includes("TELLER")
            ? "TELLER"
            : roles.includes("CUSTOMER")
            ? "CUSTOMER"
            : "TELLER";

          const authData = {
            token: keycloakInstance.token,
            username: keycloakInstance.tokenParsed?.preferred_username || "keycloak_user",
            role: primaryRole,
            roles,
          };
          setAuth(authData);

          const refreshInterval = setInterval(() => {
            keycloakInstance.updateToken(70).then((refreshed) => {
              if (refreshed) {
                setAuth((prev) => ({
                  ...prev,
                  token: keycloakInstance.token,
                }));
              }
            }).catch(() => {});
          }, 60000);

          return () => clearInterval(refreshInterval);
        }
      })
      .catch((err) => {
        console.warn("Keycloak init failed:", err);
        setKeycloakReady(true);
      });
  }, []);

  useEffect(() => {
    setLatencyListener((latency) => setApiLatency(latency));
  }, []);

  useEffect(() => {
    if (auth) {
      sessionStorage.setItem("fincore_auth", JSON.stringify(auth));
    } else {
      sessionStorage.removeItem("fincore_auth");
    }
  }, [auth]);

  // On mount and whenever a customer is logged in, load portal data immediately,
  // subscribe to real-time cross-tab broadcast events (0ms push), and poll gently with visibility-awareness
  useEffect(() => {
    if (!auth || auth.role !== "CUSTOMER") return;

    let isMounted = true;
    let isRateLimited = false;

    const fetchPortal = async () => {
      // Don't waste requests if tab is in the background or currently backed off
      if (typeof document !== "undefined" && document.hidden) return;
      if (isRateLimited) return;

      const headers = auth.token
        ? { Authorization: `Bearer ${auth.token}`, "Cache-Control": "no-cache" }
        : auth.username && auth.password
        ? { Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`, "Cache-Control": "no-cache" }
        : { "Cache-Control": "no-cache" };
      try {
        const res = await fetch(`${API_BASE_URL}/customer-portal/me?_t=${Date.now()}`, {
          headers,
          cache: "no-store",
        });
        if (res.ok && isMounted) {
          isRateLimited = false;
          const data = await res.json();
          const normalized = data
            ? {
                ...data,
                id: data.id || data.customerId,
                customerId: data.customerId || data.id,
              }
            : null;
          setCustomerPortal(normalized);
        } else if (res.status === 429) {
          // Temporarily back off for 10 seconds to allow bucket refill
          isRateLimited = true;
          setTimeout(() => {
            isRateLimited = false;
          }, 10000);
        }
      } catch {
        // Ignore background polling errors
      }
    };

    fetchPortal();
    // Gentle 6-second background interval (0ms push events handle freeze/unfreeze instantly)
    const intervalId = setInterval(fetchPortal, 6000);

    // Refresh immediately when user switches back to this tab
    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden && isMounted) {
        fetchPortal();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    // Cross-tab real-time listener: instant push update when manager freezes/unfreezes
    const unsubscribe = subscribeToAccountChanges((event) => {
      if (!isMounted) return;
      // Optimistic instant state update in 0ms
      setCustomerPortal((prev) => {
        if (!prev || !prev.accounts) return prev;
        const updatedAccounts = prev.accounts.map((acc) => {
          if (acc.id === event.accountId || acc.accountNumber === event.accountNumber) {
            return { ...acc, status: event.status };
          }
          return acc;
        });
        return { ...prev, accounts: updatedAccounts };
      });
      // Immediately verify with backend
      fetchPortal();
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      unsubscribe();
    };
  }, [auth]);

  async function login(username, password) {
    const candidate = {
      username: username.trim(),
      password,
    };
    const headers = {
      Authorization: `Basic ${btoa(`${candidate.username}:${candidate.password}`)}`,
    };

    // 1. Try unified auth/me endpoint
    try {
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, { headers });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        const role = meData.role || "TELLER";
        let portalData = null;
        if (role === "CUSTOMER") {
          try {
            const portalRes = await fetch(`${API_BASE_URL}/customer-portal/me`, { headers });
            if (portalRes.ok) {
              const pData = await portalRes.json();
              portalData = pData
                ? {
                    ...pData,
                    id: pData.id || pData.customerId,
                    customerId: pData.customerId || pData.id,
                  }
                : null;
            }
          } catch {
            // ignore
          }
        }
        const authData = {
          ...candidate,
          role,
          roles: meData.roles,
          customerId: portalData?.customerId || portalData?.id,
        };
        setCustomerPortal(portalData);
        setAuth(authData);
        return { role, portalData };
      } else if (meResponse.status === 401 || meResponse.status === 403) {
        throw new Error("Invalid username or password.");
      }
    } catch (err) {
      if (err.message && err.message.includes("Invalid username")) {
        throw err;
      }
      // Continue to fallback checks below
    }

    // 2. Fallback: try customer portal
    try {
      const portalResponse = await fetch(`${API_BASE_URL}/customer-portal/me`, { headers });
      if (portalResponse.ok) {
        const pData = await portalResponse.json();
        const portalData = pData
          ? {
              ...pData,
              id: pData.id || pData.customerId,
              customerId: pData.customerId || pData.id,
            }
          : null;
        const authData = {
          ...candidate,
          role: "CUSTOMER",
          customerId: portalData?.customerId || portalData?.id,
        };
        setCustomerPortal(portalData);
        setAuth(authData);
        return { role: "CUSTOMER", portalData };
      }
    } catch {
      // Continue to check teller
    }

    // 3. Fallback: try teller / staff API
    try {
      const response = await fetch(`${API_BASE_URL}/accounts`, { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Invalid credentials, or your role cannot access this page.");
        }
        throw new Error(`Backend returned ${response.status}. Make sure Spring Boot is running.`);
      }
      const authData = { ...candidate, role: "TELLER" };
      setCustomerPortal(null);
      setAuth(authData);
      return { role: "TELLER" };
    } catch (err) {
      if (err.message && (err.message.includes("Invalid credentials") || err.message.includes("Backend returned") || err.message.includes("Invalid username"))) {
        throw err;
      }
      throw new Error("Cannot connect to the backend. Start Spring Boot and PostgreSQL, then try again.", {
        cause: err,
      });
    }
  }

  function loginWithToken(token, userProfile = {}) {
    const role = (userProfile.roles && userProfile.roles[0]) || userProfile.role || "TELLER";
    const authData = {
      token,
      username: userProfile.preferred_username || userProfile.username || "oauth_user",
      role,
      roles: userProfile.roles || [role],
    };
    setAuth(authData);
    return authData;
  }

  function loginWithKeycloak() {
    if (keycloakInstance) {
      keycloakInstance.login();
    }
  }

  function logout() {
    if (keycloakInstance && keycloakInstance.authenticated) {
      keycloakInstance.logout();
    }
    setAuth(null);
    setCustomerPortal(null);
    sessionStorage.removeItem("fincore_auth");
  }

  async function refreshPortalData() {
    if (!auth || auth.role !== "CUSTOMER") return null;
    const headers = auth.token
      ? { Authorization: `Bearer ${auth.token}`, "Cache-Control": "no-cache" }
      : auth.username && auth.password
      ? { Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`, "Cache-Control": "no-cache" }
      : { "Cache-Control": "no-cache" };
    try {
      const res = await fetch(`${API_BASE_URL}/customer-portal/me?_t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data
          ? {
              ...data,
              id: data.id || data.customerId,
              customerId: data.customerId || data.id,
            }
          : null;
        setCustomerPortal(normalized);
        return normalized;
      }
    } catch {
      // Ignore background refresh errors
    }
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        auth,
        customerPortal,
        setCustomerPortal,
        login,
        loginWithToken,
        loginWithKeycloak,
        logout,
        refreshPortalData,
        apiLatency,
        isKeycloakMode,
        keycloakReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
