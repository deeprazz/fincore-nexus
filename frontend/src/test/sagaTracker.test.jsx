import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomerSagaTracker from "../features/customer-portal/CustomerSagaTracker";
import PaymentSagaTracker from "../features/payments/PaymentSagaTracker";

vi.mock("jspdf", () => {
  return {
    default: class MockJsPDF {
      setFillColor = vi.fn();
      rect = vi.fn();
      setTextColor = vi.fn();
      setFont = vi.fn();
      setFontSize = vi.fn();
      text = vi.fn();
      setDrawColor = vi.fn();
      line = vi.fn();
      save = vi.fn();
    },
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    auth: { token: "fake-jwt", role: "teller", username: "teller1" },
  }),
}));

vi.mock("../api/payments", () => ({
  getPayment: vi.fn().mockResolvedValue({
    id: "pay-123",
    status: "SETTLED",
    amount: 1500,
    paymentRail: "IMPS",
    utr: "FINC12345678",
    createdAt: new Date().toISOString(),
  }),
  getPaymentSaga: vi.fn().mockResolvedValue({
    state: "SETTLED",
    step: "COMPLETED",
  }),
}));

describe("CustomerSagaTracker Component", () => {
  const sampleSagaData = {
    utr: "FINC987654321",
    fromAccount: "1000-0000-0001",
    toAccount: "1000-0000-0002",
    amount: 60.0,
    timestamp: "2026-11-21T09:00:00Z",
  };

  it("renders live executing stage with PROCESSING badges", () => {
    render(
      <CustomerSagaTracker
        sagaData={sampleSagaData}
        stageIndex={3}
        isFinished={false}
      />
    );

    expect(screen.getByText("FINC987654321")).toBeInTheDocument();
    expect(screen.getByText("₹60.00")).toBeInTheDocument();
    expect(screen.getByText("1000-0000-0001")).toBeInTheDocument();
    expect(screen.getByText("1000-0000-0002")).toBeInTheDocument();
    expect(screen.getByText("EXECUTING SAGA")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
  });

  it("renders SETTLED state with VERIFIED badges and receipt download", () => {
    const handleReset = vi.fn();
    const handleStatements = vi.fn();

    render(
      <CustomerSagaTracker
        sagaData={sampleSagaData}
        stageIndex={8}
        isFinished={true}
        onReset={handleReset}
        onViewStatements={handleStatements}
      />
    );

    expect(screen.getByText("SETTLED")).toBeInTheDocument();
    const verifiedBadges = screen.getAllByText("VERIFIED");
    expect(verifiedBadges.length).toBe(8);

    const downloadBtn = screen.getByText("Download PDF Receipt");
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);

    const makeAnotherBtn = screen.getByText("Make Another Transfer");
    fireEvent.click(makeAnotherBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);

    const stmtBtn = screen.getByText("View in Statements →");
    fireEvent.click(stmtBtn);
    expect(handleStatements).toHaveBeenCalledTimes(1);
  });

  it("renders FAILED state with error message", () => {
    render(
      <CustomerSagaTracker
        sagaData={sampleSagaData}
        stageIndex={5}
        isFinished={false}
        errorMessage="Insufficient funds in source account."
      />
    );

    const failedBadges = screen.getAllByText("FAILED");
    expect(failedBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Transfer Execution Failed")).toBeInTheDocument();
    expect(
      screen.getByText("Insufficient funds in source account.")
    ).toBeInTheDocument();
  });
});

describe("PaymentSagaTracker Component", () => {
  const samplePayment = {
    id: "pay-999",
    status: "SETTLED",
    amount: 500,
    paymentRail: "UPI",
    utr: "FINC999888",
    sourceAccountId: "acc-1",
    targetVpa: "merchant@upi",
    createdAt: new Date().toISOString(),
  };

  it("renders 9 stages timeline and summary grid", () => {
    render(<PaymentSagaTracker payment={samplePayment} />);

    expect(screen.getByText("Payment Successful & Settled")).toBeInTheDocument();
    expect(screen.getByText("Distributed Payment Saga Execution Timeline")).toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
    expect(screen.getByText("FINC999888")).toBeInTheDocument();
  });
});
