import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/constants";
import { setLatencyListener } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("fincore_auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [customerPortal, setCustomerPortal] = useState(null);
  const [apiLatency, setApiLatency] = useState(null);

  useEffect(() => {
    setLatencyListener((latency) => setApiLatency(latency));
  }, []);

  useEffect(() => {
    if (auth) {
      localStorage.setItem("fincore_auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("fincore_auth");
    }
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
              portalData = await portalRes.json();
            }
          } catch {
            // ignore
          }
        }
        const authData = { ...candidate, role, roles: meData.roles };
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
        const portalData = await portalResponse.json();
        const authData = { ...candidate, role: "CUSTOMER" };
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

  function logout() {
    setAuth(null);
    setCustomerPortal(null);
    localStorage.removeItem("fincore_auth");
  }

  async function refreshPortalData() {
    if (!auth || auth.role !== "CUSTOMER") return null;
    const headers = {
      Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/customer-portal/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCustomerPortal(data);
        return data;
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
        logout,
        refreshPortalData,
        apiLatency,
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
