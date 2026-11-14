import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MasterDashboard from "../features/dashboard/MasterDashboard";

vi.mock("../api/client", () => ({
  apiRequest: vi.fn((path) => {
    if (path === "/dashboard/summary") {
      return Promise.resolve({
        activeAccounts: 14,
        totalBalance: 2500000,
        transactionsToday: 52,
        latencyP50Ms: 3.2,
        latencyP95Ms: 7.9,
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
  }),
  setLatencyListener: vi.fn(),
}));

describe("MasterDashboard Component", () => {
  it("renders cross-module cards with real telemetry data", async () => {
    render(
      <MemoryRouter>
        <MasterDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("FinCore Nexus Master Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Core Banking (M1)")).toBeInTheDocument();
    expect(screen.getByText("Loans & Credit (M2)")).toBeInTheDocument();
    expect(screen.getByText("Payments (M3)")).toBeInTheDocument();
    expect(screen.getByText("KYC & Compliance (M4)")).toBeInTheDocument();
    expect(screen.getByText("84.5 req/s")).toBeInTheDocument();
  });
});
