import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FraudCheckBadge from "../features/payments/FraudCheckBadge";
import SagaStatusTimeline from "../features/payments/SagaStatusTimeline";
import BeneficiaryList from "../features/payments/BeneficiaryList";

describe("Payment Components", () => {
  it("FraudCheckBadge renders score and decision badge", () => {
    render(<FraudCheckBadge score={0.25} decision="ALLOW" rules="LOW_RISK" />);
    expect(screen.getByText("ALLOW")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("LOW_RISK")).toBeInTheDocument();
  });

  it("FraudCheckBadge displays BLOCK badge on high risk", () => {
    render(<FraudCheckBadge score={0.85} decision="BLOCK" rules="HIGH_VELOCITY, UNVERIFIED_BENEFICIARY" />);
    expect(screen.getByText("BLOCK")).toBeInTheDocument();
    expect(screen.getByText("85.0%")).toBeInTheDocument();
    expect(screen.getByText("HIGH_VELOCITY")).toBeInTheDocument();
  });

  it("SagaStatusTimeline highlights stages and failure reason", () => {
    render(
      <SagaStatusTimeline
        status="FAILED"
        failureReason="Insufficient funds in source account"
      />
    );
    expect(screen.getByText(/Insufficient funds in source account/)).toBeInTheDocument();
    expect(screen.getByText("Fraud Check")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("BeneficiaryList shows empty state when list is empty", () => {
    render(<BeneficiaryList beneficiaries={[]} />);
    expect(screen.getByText(/No beneficiaries registered/i)).toBeInTheDocument();
  });

  it("BeneficiaryList renders beneficiaries with status and verify button", () => {
    const list = [
      {
        id: "b1",
        name: "Aakash Verma",
        accountNumber: "100000000002",
        ifscCode: "FINC0001234",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
    ];
    render(<BeneficiaryList beneficiaries={list} onVerifyPennyDrop={vi.fn()} />);
    expect(screen.getByText("Aakash Verma")).toBeInTheDocument();
    expect(screen.getByText("100000000002")).toBeInTheDocument();
    expect(screen.getByText("Verify Penny-Drop")).toBeInTheDocument();
  });
});
