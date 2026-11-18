import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PortalLoans } from "../features/customer-portal/PortalLoans";
import * as LoansApi from "../api/loans";
import * as AuthContextModule from "../context/AuthContext";
import * as ToastContextModule from "../context/ToastContext";

describe("PortalLoans Component", () => {
  const mockAuth = {
    auth: { username: "ankit@example.com", password: "Password@123", role: "CUSTOMER" },
    customerPortal: {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "Ankit Sharma",
      email: "ankit@example.com",
      kycStatus: "VERIFIED",
      accounts: [{ id: "acc-1", accountNumber: "1001", balance: 50000 }],
    },
    refreshPortalData: vi.fn(),
  };

  const mockToast = { setError: vi.fn(), setSuccess: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);
    vi.spyOn(ToastContextModule, "useToast").mockReturnValue(mockToast);
    vi.spyOn(LoansApi, "getCustomerLoans").mockResolvedValue([
      {
        id: "loan-1111-2222",
        customerId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        principalAmount: 50000,
        outstandingAmount: 42000,
        interestRate: 0.1,
        emiAmount: 2307,
        tenureMonths: 24,
        status: "ACTIVE",
      },
    ]);
    vi.spyOn(LoansApi, "getCustomerApplications").mockResolvedValue([
      {
        id: "app-3333-4444",
        customerId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        requestedAmount: 50000,
        tenureMonths: 24,
        purpose: "Personal Loan",
        status: "APPROVED",
        creditScore: 750,
      },
    ]);
    vi.spyOn(LoansApi, "submitApplication").mockResolvedValue({
      id: "app-9999",
      creditScore: 780,
      status: "APPROVED",
    });
  });

  it("renders personal banking loans header and metrics", async () => {
    render(<PortalLoans />);

    expect(screen.getByText(/Loans & Line of Credit/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly EMI Obligations/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply for Loan/i)).toBeInTheDocument();
  });

  it("allows switching to EMI calculator tab and viewing estimated EMI", async () => {
    render(<PortalLoans />);

    const calcTab = screen.getByRole("button", { name: /EMI Calculator/i });
    fireEvent.click(calcTab);

    expect(screen.getByText(/Interactive Loan & EMI Calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/YOUR ESTIMATED MONTHLY EMI/i)).toBeInTheDocument();
  });

  it("allows switching to My Loans tab and seeing active loans", async () => {
    render(<PortalLoans />);

    await waitFor(() => {
      expect(LoansApi.getCustomerLoans).toHaveBeenCalled();
    });

    const loansTab = screen.getByRole("button", { name: /My Loans & Schedules/i });
    fireEvent.click(loansTab);

    expect(await screen.findByText(/LN-LOAN-111/i)).toBeInTheDocument();
    expect(screen.getAllByText(/42,000/i).length).toBeGreaterThanOrEqual(1);
  });

  it("submits application and displays assessment feedback", async () => {
    render(<PortalLoans />);

    const submitBtn = screen.getByRole("button", { name: /Submit Application & Check Eligibility/i });
    fireEvent.submit(submitBtn.closest("form"));

    await waitFor(() => {
      expect(LoansApi.submitApplication).toHaveBeenCalled();
      expect(mockToast.setSuccess).toHaveBeenCalledWith(
        expect.stringContaining("Loan application submitted successfully")
      );
    });
  });
});
