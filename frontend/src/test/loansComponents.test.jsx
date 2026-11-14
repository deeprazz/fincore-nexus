import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreditAssessmentCard } from "../features/loans/CreditAssessmentCard";
import { DisbursementSagaTimeline } from "../features/loans/DisbursementSagaTimeline";
import { EmiCalculator } from "../features/loans/EmiCalculator";
import { EmiScheduleTable } from "../features/loans/EmiScheduleTable";
import { LoanApplicationForm } from "../features/loans/LoanApplicationForm";
import { LoanList } from "../features/loans/LoanList";
import { LoanDetail } from "../features/loans/LoanDetail";
import { NpaPanel } from "../features/loans/NpaPanel";
import { CollectionsPage } from "../features/loans/CollectionsPage";
import * as LoansApi from "../api/loans";
import * as CustomersApi from "../api/customers";
import * as AuthContextModule from "../context/AuthContext";
import * as ToastContextModule from "../context/ToastContext";

describe("Loan Components Test Suite", () => {
  const mockAuth = { auth: { username: "teller", password: "123" } };
  const mockToast = { setError: vi.fn(), setSuccess: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);
    vi.spyOn(ToastContextModule, "useToast").mockReturnValue(mockToast);
  });

  describe("CreditAssessmentCard", () => {
    it("renders score, APPROVED badge, and interest rate correctly", () => {
      render(
        <CreditAssessmentCard
          score={820}
          decision="APPROVED"
          reason="Excellent credit profile"
          rate={0.08}
        />
      );

      expect(screen.getByText("820")).toBeInTheDocument();
      expect(screen.getByText("APPROVED")).toBeInTheDocument();
      expect(screen.getByText("8.0% p.a.")).toBeInTheDocument();
      expect(screen.getByText("Tier 1 (Prime)")).toBeInTheDocument();
      expect(screen.getByText(/Excellent credit profile/)).toBeInTheDocument();
    });

    it("renders MANUAL_REVIEW and REJECTED decisions", () => {
      const { rerender } = render(
        <CreditAssessmentCard score={620} decision="MANUAL_REVIEW" rate={0.14} />
      );
      expect(screen.getByText("620")).toBeInTheDocument();
      expect(screen.getByText("MANUAL REVIEW")).toBeInTheDocument();
      expect(screen.getByText("14.0% p.a.")).toBeInTheDocument();

      rerender(<CreditAssessmentCard score={520} decision="REJECTED" rate={0} />);
      expect(screen.getByText("520")).toBeInTheDocument();
      expect(screen.getByText("REJECTED")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  describe("DisbursementSagaTimeline", () => {
    it("renders all 5 steps in the saga timeline", () => {
      render(<DisbursementSagaTimeline status="ACTIVE" />);
      expect(screen.getByText("Application Submitted")).toBeInTheDocument();
      expect(screen.getByText("Credit Assessed")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Disbursed")).toBeInTheDocument();
      expect(screen.getByText("Loan Active")).toBeInTheDocument();
    });

    it("displays error banner when status is REJECTED", () => {
      render(
        <DisbursementSagaTimeline
          status="REJECTED"
          failedReason="Credit score below minimum cutoff"
        />
      );
      expect(screen.getByText("Halted / Failed")).toBeInTheDocument();
      expect(
        screen.getByText("Credit score below minimum cutoff")
      ).toBeInTheDocument();
    });
  });

  describe("EmiCalculator", () => {
    it("computes monthly EMI and total payable in real time", () => {
      render(<EmiCalculator />);
      expect(screen.getByText("EMI Loan Calculator")).toBeInTheDocument();
      expect(screen.getByText("Monthly EMI")).toBeInTheDocument();
      expect(screen.getByText("Principal Amount")).toBeInTheDocument();
      expect(screen.getByText("Total Interest")).toBeInTheDocument();
      expect(screen.getByText("Total Payable")).toBeInTheDocument();
    });

    it("updates EMI when principal slider changes", () => {
      render(<EmiCalculator />);
      const principalSlider = screen.getByLabelText(/Principal Loan Amount/i);
      fireEvent.change(principalSlider, { target: { value: "1000000" } });
      expect(screen.getAllByText("₹10,00,000.00").length).toBeGreaterThan(0);
    });
  });

  describe("EmiScheduleTable", () => {
    it("renders installments and overdue penalty", () => {
      const schedule = [
        {
          installmentNumber: 1,
          dueDate: "2026-12-01",
          emiAmount: 15000,
          principalComponent: 10000,
          interestComponent: 5000,
          outstandingBalance: 85000,
          status: "PAID",
          penalty: 0,
        },
        {
          installmentNumber: 2,
          dueDate: "2027-01-01",
          emiAmount: 15000,
          principalComponent: 10500,
          interestComponent: 4500,
          outstandingBalance: 74500,
          status: "OVERDUE",
          penalty: 500,
          daysOverdue: 14,
        },
      ];

      render(<EmiScheduleTable schedule={schedule} />);
      expect(screen.getByText("PAID")).toBeInTheDocument();
      expect(screen.getByText("OVERDUE (14d)")).toBeInTheDocument();
      expect(screen.getByText("+₹500.00")).toBeInTheDocument();
    });
  });

  describe("LoanApplicationForm", () => {
    it("submits application and renders instant credit assessment feedback", async () => {
      vi.spyOn(CustomersApi, "getCustomers").mockResolvedValue([
        { id: "cust-123", name: "Ramesh Sharma", email: "ramesh@example.com" },
      ]);

      const submitSpy = vi.spyOn(LoansApi, "submitApplication").mockResolvedValue({
        id: "app-uuid-999",
        customerId: "cust-123",
        requestedAmount: 200000,
        tenureMonths: 24,
        status: "APPROVED",
        creditScore: 780,
      });

      render(
        <LoanApplicationForm
          customers={[
            { id: "cust-123", name: "Ramesh Sharma", email: "ramesh@example.com" },
          ]}
        />
      );

      const amountInput = screen.getByLabelText(/Requested Amount/i);
      fireEvent.change(amountInput, { target: { value: "200000" } });

      const submitBtn = screen.getByRole("button", {
        name: /Submit Application & Assess/i,
      });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalled();
        expect(
          screen.getByText("Application #app-uuid Evaluated")
        ).toBeInTheDocument();
        expect(screen.getByText("780")).toBeInTheDocument();
        expect(screen.getByText("APPROVED")).toBeInTheDocument();
      });
    });
  });

  describe("LoanList", () => {
    it("renders loans table and allows search filtering", async () => {
      vi.spyOn(LoansApi, "getLoans").mockResolvedValue([
        {
          id: "loan-101-alpha",
          customerId: "cust-01",
          principalAmount: 500000,
          outstandingAmount: 420000,
          tenureMonths: 36,
          emiAmount: 16100,
          status: "ACTIVE",
          npaCategory: "STANDARD",
        },
        {
          id: "loan-202-beta",
          customerId: "cust-02",
          principalAmount: 200000,
          outstandingAmount: 180000,
          tenureMonths: 24,
          emiAmount: 9200,
          status: "ACTIVE",
          npaCategory: "SMA_1",
        },
      ]);

      render(<LoanList onSelectLoan={vi.fn()} onViewSchedule={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("loan-101...")).toBeInTheDocument();
        expect(screen.getByText("loan-202...")).toBeInTheDocument();
      });

      // Filter by search
      const searchInput = screen.getByPlaceholderText(/Search by Loan ID/i);
      fireEvent.change(searchInput, { target: { value: "alpha" } });

      expect(screen.getByText("loan-101...")).toBeInTheDocument();
      expect(screen.queryByText("loan-202...")).not.toBeInTheDocument();
    });
  });

  describe("LoanDetail", () => {
    it("renders details and handles prepay modal interaction", async () => {
      const loan = {
        id: "loan-abc-123",
        customerId: "cust-1",
        principalAmount: 300000,
        outstandingAmount: 250000,
        tenureMonths: 24,
        emiAmount: 14000,
        interestRate: 0.1,
        status: "ACTIVE",
        npaCategory: "STANDARD",
        startDate: "2026-01-01",
        endDate: "2028-01-01",
      };

      const prepaySpy = vi
        .spyOn(LoansApi, "prepayLoan")
        .mockResolvedValue({ success: true });

      render(<LoanDetail loan={loan} onBack={vi.fn()} onViewSchedule={vi.fn()} />);

      expect(screen.getByText("Loan Account #loan-abc")).toBeInTheDocument();
      expect(screen.getByText("₹2,50,000.00")).toBeInTheDocument();

      // Open prepay modal
      const prepayBtn = screen.getByRole("button", { name: /Prepay Loan/i });
      fireEvent.click(prepayBtn);

      expect(screen.getByText("Prepay Loan Amount")).toBeInTheDocument();

      const prepayInput = screen.getByPlaceholderText("e.g. 50000");
      fireEvent.change(prepayInput, { target: { value: "30000" } });

      const confirmBtn = screen.getByRole("button", {
        name: /Confirm Prepayment/i,
      });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(prepaySpy).toHaveBeenCalledWith("loan-abc-123", 30000, mockAuth.auth);
      });
    });
  });

  describe("NpaPanel", () => {
    it("renders portfolio KPIs and NPA classification buckets", async () => {
      vi.spyOn(LoansApi, "getPortfolio").mockResolvedValue({
        totalOutstanding: 10000000,
        totalDisbursedYtd: 12000000,
        activeLoanCount: 25,
        npaRatio: 1.85,
        buckets: {
          STANDARD: { count: 20, amount: 9000000 },
          SMA_0: { count: 2, amount: 500000 },
          SMA_1: { count: 1, amount: 250000 },
          SMA_2: { count: 1, amount: 150000 },
          NPA: { count: 1, amount: 100000 },
        },
      });

      render(<NpaPanel />);

      await waitFor(() => {
        expect(screen.getByText("1.85%")).toBeInTheDocument();
        expect(screen.getByText("Standard Assets")).toBeInTheDocument();
        expect(screen.getByText("SMA-0")).toBeInTheDocument();
        expect(screen.getByText("SMA-1")).toBeInTheDocument();
        expect(screen.getByText("SMA-2")).toBeInTheDocument();
        expect(screen.getByText("NPA (Non-Performing)")).toBeInTheDocument();
      });
    });
  });

  describe("CollectionsPage", () => {
    it("renders overdue loans and logs recovery notes", async () => {
      vi.spyOn(LoansApi, "getOverdueCollections").mockResolvedValue([
        {
          id: "loan-overdue-1",
          customerId: "cust-9",
          outstandingAmount: 85000,
          daysPastDue: 35,
          penalty: 1200,
        },
      ]);

      vi.spyOn(LoansApi, "getCollectionNotes").mockResolvedValue([]);
      const addNoteSpy = vi
        .spyOn(LoansApi, "addCollectionNote")
        .mockResolvedValue({ id: "note-1" });

      render(<CollectionsPage />);

      await waitFor(() => {
        expect(screen.getByText("35 Days")).toBeInTheDocument();
        expect(screen.getAllByText("₹85,000.00")[0]).toBeInTheDocument();
      });

      const noteTextarea = screen.getByPlaceholderText(
        /Borrower agreed to clear overdue/i
      );
      fireEvent.change(noteTextarea, {
        target: { value: "Contacted borrower; scheduled repayment on Monday" },
      });

      const submitNoteBtn = screen.getByRole("button", {
        name: /Add Recovery Note/i,
      });
      fireEvent.click(submitNoteBtn);

      await waitFor(() => {
        expect(addNoteSpy).toHaveBeenCalledWith(
          "loan-overdue-1",
          "Contacted borrower; scheduled repayment on Monday",
          "CALLED_BORROWER",
          mockAuth.auth
        );
      });
    });
  });
});
