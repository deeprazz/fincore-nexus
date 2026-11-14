import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "../api/client";
import {
  initiatePayment,
  getPayments,
  getBeneficiaries,
  verifyPennyDrop,
  getSettlementReport,
} from "../api/payments";

describe("Payments API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initiatePayment calls /payments with POST and Idempotency-Key", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue({ id: "p1", utr: "FINC123" });
    const payload = { amount: 1000, paymentRail: "IMPS" };
    const res = await initiatePayment(payload, "key-123");

    expect(spy).toHaveBeenCalledWith("/payments", {
      method: "POST",
      headers: { "Idempotency-Key": "key-123" },
      body: JSON.stringify(payload),
    });
    expect(res.utr).toBe("FINC123");
  });

  it("getPayments queries /payments with optional customerId", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue([]);
    await getPayments("c123");
    expect(spy).toHaveBeenCalledWith("/payments?customerId=c123");
  });

  it("getBeneficiaries queries /beneficiaries", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue([]);
    await getBeneficiaries();
    expect(spy).toHaveBeenCalledWith("/beneficiaries");
  });

  it("verifyPennyDrop calls /beneficiaries/:id/verify with POST", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue({ status: "VERIFIED" });
    const res = await verifyPennyDrop("b1");
    expect(spy).toHaveBeenCalledWith("/beneficiaries/b1/verify", { method: "POST" });
    expect(res.status).toBe("VERIFIED");
  });

  it("getSettlementReport queries /settlement/report", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue({ totalPayments: 10 });
    const res = await getSettlementReport();
    expect(spy).toHaveBeenCalledWith("/settlement/report");
    expect(res.totalPayments).toBe(10);
  });
});
