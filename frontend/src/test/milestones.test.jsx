import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MilestonesPage from "../features/milestones/MilestonesPage";
import * as AuthContextModule from "../context/AuthContext";
import * as ToastContextModule from "../context/ToastContext";

// Mock sound effects
vi.mock("../utils/soundEffects", () => ({
  playTickSound: vi.fn(),
}));

// Mock api client
vi.mock("../api/client", () => ({
  apiRequest: vi.fn().mockImplementation((path) => {
    if (path === "/dashboard/summary") {
      return Promise.resolve({
        activeAccounts: 2400000,
        transactionsToday: 12400000,
        totalBalance: 12847.5,
        uptimeFormatted: "99.99%",
        latencyP50Ms: 47,
        tps: 12400,
      });
    }
    if (path === "/loans/portfolio") {
      return Promise.resolve({
        activeLoansCount: 847000,
        totalDisbursed: 2400000000,
        npaRatio: 2.3,
      });
    }
    if (path === "/payments") {
      return Promise.resolve([
        { id: "1", utr: "IMPS123456789", status: "SETTLED", amount: 2400 },
      ]);
    }
    if (path === "/kyc") {
      return Promise.resolve([
        { id: "1", status: "APPROVED", fullName: "Jane Doe" },
      ]);
    }
    return Promise.resolve({});
  }),
}));

describe("MilestonesPage Component", () => {
  const mockSetError = vi.fn();
  const mockSetSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      auth: { username: "teller", role: "TELLER", token: "mock-token" },
    });
    vi.spyOn(ToastContextModule, "useToast").mockReturnValue({
      setError: mockSetError,
      setSuccess: mockSetSuccess,
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <MilestonesPage />
      </BrowserRouter>
    );

  it("renders page header and default Milestone 1 screen", () => {
    renderComponent();

    expect(screen.getByText(/FinCore Nexus — Milestones & Specification Hub/i)).toBeInTheDocument();
    expect(screen.getByText("Core Banking Operations")).toBeInTheDocument();
    expect(screen.getByText("2.4M")).toBeInTheDocument();
    expect(screen.getByText("12.4M")).toBeInTheDocument();
    expect(screen.getByText("99.99%")).toBeInTheDocument();
    expect(screen.getByText("1234-5678-9012")).toBeInTheDocument();
    expect(screen.getByText("$12,847.50")).toBeInTheDocument();
    expect(screen.getByText("Deposit $2,400")).toBeInTheDocument();
    expect(screen.getByText("Milestone 1 Validation Screens Checklist")).toBeInTheDocument();
  });

  it("switches to Milestone 2 and displays loan origination specifications", async () => {
    renderComponent();

    const m2Tab = screen.getByRole("button", { name: /Milestone 2: Loan Management/i });
    fireEvent.click(m2Tab);

    expect(screen.getByText("Loan Origination & Servicing")).toBeInTheDocument();
    expect(screen.getByText("847K")).toBeInTheDocument();
    expect(screen.getByText("$2.4B")).toBeInTheDocument();
    expect(screen.getByText("2.3%")).toBeInTheDocument();
    expect(screen.getByText("HL-2024-1247")).toBeInTheDocument();
    expect(screen.getByText("$240,000")).toBeInTheDocument();
    expect(screen.getByText("$1,847")).toBeInTheDocument();
    expect(screen.getByText("Milestone 2 Validation Screens Checklist")).toBeInTheDocument();
  });

  it("switches to Milestone 3 and displays payment transfer specifications", async () => {
    renderComponent();

    const m3Tab = screen.getByRole("button", { name: /Milestone 3: Payment & Transfer/i });
    fireEvent.click(m3Tab);

    expect(screen.getByText("IMPS/NEFT/UPI Processing")).toBeInTheDocument();
    expect(screen.getByText("12.4K")).toBeInTheDocument();
    expect(screen.getByText("99.97%")).toBeInTheDocument();
    expect(screen.getByText("T+0")).toBeInTheDocument();
    expect(screen.getByText("IMPS123456789")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Milestone 3 Validation Screens Checklist")).toBeInTheDocument();
  });

  it("switches to Milestone 4 and displays KYC onboarding specifications", async () => {
    renderComponent();

    const m4Tab = screen.getByRole("button", { name: /Milestone 4: KYC & Compliance/i });
    fireEvent.click(m4Tab);

    expect(screen.getByText("Customer Onboarding & Audit")).toBeInTheDocument();
    expect(screen.getByText("2.1M")).toBeInTheDocument();
    expect(screen.getAllByText("4.2 min").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("#KYC-2024-1247")).toBeInTheDocument();
    expect(screen.getByText("Face match 94%")).toBeInTheDocument();
    expect(screen.getByText("Milestone 4 Validation Screens Checklist")).toBeInTheDocument();
  });

  it("switches to Master Platform and displays Page 8 architecture topology", () => {
    renderComponent();

    const masterTab = screen.getByRole("button", { name: /Master Platform \(Page 8\)/i });
    fireEvent.click(masterTab);

    expect(screen.getByText(/FinCore Nexus — Final Integrated Banking Platform \(Page 8\)/i)).toBeInTheDocument();
    expect(screen.getByText("FinCore")).toBeInTheDocument();
    expect(screen.getByText("Platform Core")).toBeInTheDocument();
    expect(screen.getByText("Banking Command")).toBeInTheDocument();
  });

  it("switches to Validation Framework and renders 10 test suites", () => {
    renderComponent();

    const frameworkTab = screen.getByRole("button", { name: /Validation Framework \(Page 9\)/i });
    fireEvent.click(frameworkTab);

    expect(screen.getByText("Validation Screens Framework (Page 9 Specification)")).toBeInTheDocument();
    expect(screen.getByText("1. Account Balance Validation")).toBeInTheDocument();
    expect(screen.getByText("2. Transaction Atomicity (ACID)")).toBeInTheDocument();
    expect(screen.getByText("3. Loan Amortization & Compliance")).toBeInTheDocument();
    expect(screen.getByText("9. Immutable SHA-256 Hash Chain Proof")).toBeInTheDocument();
  });

  it("opens View Statement modal in Milestone 1", () => {
    renderComponent();

    const viewStmtBtn = screen.getByRole("button", { name: /View Statement/i });
    fireEvent.click(viewStmtBtn);

    expect(screen.getByText(/Electronic Account Statement — 1234-5678-9012/i)).toBeInTheDocument();
    expect(screen.getByText("Print Statement")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close Preview/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Electronic Account Statement — 1234-5678-9012/i)).not.toBeInTheDocument();
  });
});
