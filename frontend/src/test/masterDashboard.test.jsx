import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MasterDashboard from "../features/dashboard/MasterDashboard";
import * as ClientModule from "../api/client";

vi.mock("../api/client", () => ({
  apiRequest: vi.fn(),
  setLatencyListener: vi.fn(),
}));

describe("MasterDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cross-module cards with real telemetry data", async () => {
    ClientModule.apiRequest.mockImplementation((path) => {
      if (path === "/dashboard/summary") {
        return Promise.resolve({
          activeAccounts: 14,
          totalBalance: 2500000,
          transactionsToday: 52,
          latencyP50Ms: 3.2,
          latencyP95Ms: 7.9,
          tps: 84.5,
        });
      }
      if (path === "/audit/verify") {
        return Promise.resolve({ valid: true });
      }
      if (path === "/loans/portfolio") {
        return Promise.resolve({
          activeLoansCount: 9,
          totalDisbursedYtd: 4500000,
          npaRatio: 0.0,
        });
      }
      if (path === "/payments") {
        return Promise.resolve([
          { id: "p1", status: "SETTLED" },
          { id: "p2", status: "SETTLED" },
        ]);
      }
      if (path === "/settlement/report") {
        return Promise.resolve({ totalBatches: 3 });
      }
      if (path === "/kyc") {
        return Promise.resolve([
          { id: "k1", status: "APPROVED" },
          { id: "k2", status: "PENDING_REVIEW" },
        ]);
      }
      if (path === "/compliance/pci-dss") {
        return Promise.resolve({ complianceScore: 100, fullyCompliant: true });
      }
      return Promise.resolve({});
    });

    render(
      <MemoryRouter>
        <MasterDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("FinCore Nexus Master Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Core Banking Ledger")).toBeInTheDocument();
    expect(screen.getByText("Loans & Credit Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Payment Clearing Rails")).toBeInTheDocument();
    expect(screen.getByText("Identity & Regulatory Compliance")).toBeInTheDocument();
    expect(screen.getByText("84.5 req/s")).toBeInTheDocument();
    expect(screen.getByText("3.2 ms")).toBeInTheDocument();
    expect(screen.getByText("7.9 ms")).toBeInTheDocument();
  });

  it("renders honest '—' and 'service unavailable' badges with failed API calls and no invented numbers", async () => {
    // All endpoints fail
    ClientModule.apiRequest.mockImplementation(() => {
      return Promise.reject(new Error("Service unavailable / offline"));
    });

    render(
      <MemoryRouter>
        <MasterDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("FinCore Nexus Master Dashboard")).toBeInTheDocument();

    // Verify service unavailable badges appear for all modules
    await waitFor(() => {
      const unavailableBadges = screen.getAllByText(/service unavailable/i);
      expect(unavailableBadges.length).toBeGreaterThanOrEqual(4);
    });

    // Verify honest dashes '—' are rendered
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(5);

    // Verify no invented numbers appear anywhere in the DOM
    const bodyText = document.body.textContent || "";
    expect(bodyText).not.toContain("3.4 ms");
    expect(bodyText).not.toContain("8.1 ms");
    expect(bodyText).not.toContain("100% Success Rate");
    expect(bodyText).not.toContain("100% Passed");
    expect(bodyText).not.toContain("1845000");
  });
});
