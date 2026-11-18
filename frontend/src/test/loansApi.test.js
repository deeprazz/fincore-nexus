import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLoans,
  getCustomerLoans,
  getLoan,
  getApplications,
  getCustomerApplications,
  getApplication,
  submitApplication,
  approveApplication,
  rejectApplication,
  calculateEmi,
  getEmiSchedule,
  prepayLoan,
  forecloseLoan,
  getPortfolio,
  getOverdueCollections,
  getCollectionNotes,
  addCollectionNote,
} from "../api/loans";
import * as ClientModule from "../api/client";

vi.mock("../api/client", () => ({
  apiRequest: vi.fn(),
}));

describe("Loans API module", () => {
  const auth = { username: "teller", password: "123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getLoans with GET /api/loans", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "loan-1" }]);
    const res = await getLoans(auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith("/api/loans", {}, auth);
    expect(res).toEqual([{ id: "loan-1" }]);
  });

  it("calls getCustomerLoans with GET /api/loans/customer/:customerId", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "cust-loan-1" }]);
    const res = await getCustomerLoans("cust-123", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith("/api/loans/customer/cust-123", {}, auth);
    expect(res).toEqual([{ id: "cust-loan-1" }]);
  });

  it("calls getLoan with GET /api/loans/:id", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ id: "loan-1" });
    const res = await getLoan("loan-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith("/api/loans/loan-1", {}, auth);
    expect(res).toEqual({ id: "loan-1" });
  });

  it("calls getApplications with GET /api/loans/applications", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "app-1" }]);
    const res = await getApplications(auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications",
      {},
      auth
    );
    expect(res).toEqual([{ id: "app-1" }]);
  });

  it("calls getCustomerApplications with GET /api/loans/applications/customer/:customerId", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "cust-app-1" }]);
    const res = await getCustomerApplications("cust-123", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications/customer/cust-123",
      {},
      auth
    );
    expect(res).toEqual([{ id: "cust-app-1" }]);
  });

  it("calls getApplication with GET /api/loans/applications/:id", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ id: "app-1" });
    const res = await getApplication("app-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications/app-1",
      {},
      auth
    );
    expect(res).toEqual({ id: "app-1" });
  });

  it("calls submitApplication with POST /api/loans/applications", async () => {
    const payload = { customerId: "cust-1", requestedAmount: 50000 };
    ClientModule.apiRequest.mockResolvedValueOnce({ id: "app-1", creditScore: 750 });
    const res = await submitApplication(payload, auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      auth
    );
    expect(res).toEqual({ id: "app-1", creditScore: 750 });
  });

  it("calls approveApplication with PATCH /api/loans/applications/:id/approve", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ id: "app-1", status: "APPROVED" });
    const res = await approveApplication("app-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications/app-1/approve",
      { method: "PATCH" },
      auth
    );
    expect(res).toEqual({ id: "app-1", status: "APPROVED" });
  });

  it("calls rejectApplication with PATCH /api/loans/applications/:id/reject", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ id: "app-1", status: "REJECTED" });
    const res = await rejectApplication("app-1", "Low score", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/applications/app-1/reject",
      {
        method: "PATCH",
        body: JSON.stringify({ reason: "Low score" }),
      },
      auth
    );
    expect(res).toEqual({ id: "app-1", status: "REJECTED" });
  });

  it("calls calculateEmi with POST /api/loans/emi/calculate", async () => {
    const req = { principal: 100000, annualRate: 0.1, tenureMonths: 12 };
    ClientModule.apiRequest.mockResolvedValueOnce({ emi: 8791.59 });
    const res = await calculateEmi(req, auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/emi/calculate",
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      auth
    );
    expect(res).toEqual({ emi: 8791.59 });
  });

  it("calls getEmiSchedule with GET /api/loans/:id/schedule", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ installmentNumber: 1 }]);
    const res = await getEmiSchedule("loan-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/loan-1/schedule",
      {},
      auth
    );
    expect(res).toEqual([{ installmentNumber: 1 }]);
  });

  it("calls prepayLoan with POST /api/loans/:id/prepay", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ success: true });
    const res = await prepayLoan("loan-1", 10000, auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/loan-1/prepay",
      {
        method: "POST",
        body: JSON.stringify({ amount: 10000 }),
      },
      auth
    );
    expect(res).toEqual({ success: true });
  });

  it("calls forecloseLoan with POST /api/loans/:id/foreclose", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ success: true });
    const res = await forecloseLoan("loan-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/loan-1/foreclose",
      { method: "POST" },
      auth
    );
    expect(res).toEqual({ success: true });
  });

  it("calls getPortfolio with GET /api/loans/portfolio", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce({ npaRatio: 2.1 });
    const res = await getPortfolio(auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith("/api/loans/portfolio", {}, auth);
    expect(res).toEqual({ npaRatio: 2.1 });
  });

  it("calls getOverdueCollections with GET /api/loans/collections/overdue", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "loan-od" }]);
    const res = await getOverdueCollections(auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/collections/overdue",
      {},
      auth
    );
    expect(res).toEqual([{ id: "loan-od" }]);
  });

  it("calls getCollectionNotes and addCollectionNote", async () => {
    ClientModule.apiRequest.mockResolvedValueOnce([{ id: "note-1" }]);
    const notes = await getCollectionNotes("loan-1", auth);
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/collections/loan-1/notes",
      {},
      auth
    );
    expect(notes).toEqual([{ id: "note-1" }]);

    ClientModule.apiRequest.mockResolvedValueOnce({ id: "note-2" });
    const added = await addCollectionNote(
      "loan-1",
      "Borrower will pay tomorrow",
      "CALLED_BORROWER",
      auth
    );
    expect(ClientModule.apiRequest).toHaveBeenCalledWith(
      "/api/loans/collections/loan-1/notes",
      {
        method: "POST",
        body: JSON.stringify({
          note: "Borrower will pay tomorrow",
          actionTaken: "CALLED_BORROWER",
        }),
      },
      auth
    );
    expect(added).toEqual({ id: "note-2" });
  });
});
