import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { PendingApprovalsPage } from "../features/approvals/PendingApprovalsPage";

const mockApprovals = [
  {
    id: "appr-1",
    operationType: "TRANSFER",
    amount: 250000,
    fromAccountId: "acc-1111-2222",
    toAccountId: "acc-3333-4444",
    maker: "teller",
    status: "PENDING_APPROVAL",
    createdAt: "2026-11-18T10:00:00Z",
  },
  {
    id: "appr-2",
    operationType: "WITHDRAWAL",
    amount: 300000,
    fromAccountId: "acc-5555-6666",
    maker: "manager",
    status: "PENDING_APPROVAL",
    createdAt: "2026-11-18T11:00:00Z",
  },
];

vi.mock("../api/approvals", () => ({
  getApprovals: vi.fn(),
  approveOperation: vi.fn(),
  rejectOperation: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    auth: { username: "manager", role: "MANAGER" },
  }),
}));

const mockToast = {
  setError: vi.fn(),
  setSuccess: vi.fn(),
};

vi.mock("../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("../hooks/useMoney", () => ({
  useMoney: () => (amount) => `₹${Number(amount).toLocaleString("en-IN")}`,
}));

describe("PendingApprovalsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pending approvals and detects maker-checker violation when maker matches current user", async () => {
    const { getApprovals } = await import("../api/approvals");
    getApprovals.mockResolvedValue(mockApprovals);

    render(<PendingApprovalsPage />);

    expect(screen.getByText("High-Value Pending Approvals")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("2 Pending")).toBeDefined();
      expect(screen.getByText("teller")).toBeDefined();
      expect(screen.getByText("manager")).toBeDefined();
    });

    // For appr-2 where maker is 'manager' and current user is 'manager', it shows '(You are maker)'
    expect(screen.getByText("(You are maker)")).toBeDefined();

    // The approve button for appr-2 must be disabled due to maker-checker
    const approveButtons = screen.getAllByRole("button", { name: "Approve" });
    expect(approveButtons.length).toBe(2);

    expect(approveButtons[0]).not.toBeDisabled();
    expect(approveButtons[1]).toBeDisabled();
    expect(approveButtons[1].getAttribute("title")).toBe("Maker cannot approve own transaction");
  });
});
