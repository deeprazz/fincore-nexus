import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "../api/client";
import {
  onboardKyc,
  approveKyc,
  rejectKyc,
  getKycApplications,
  getPendingKycApplications,
  getPciDssReport,
  verifyAuditIntegrity,
} from "../api/kyc";

describe("KYC API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onboardKyc with multipart FormData", async () => {
    const mockResponse = { id: "kyc-123", status: "PENDING_REVIEW" };
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue(mockResponse);

    const formData = new FormData();
    formData.append("fullName", "Test Applicant");

    const result = await onboardKyc(formData);
    expect(result).toEqual(mockResponse);
    expect(spy).toHaveBeenCalledWith("/kyc/onboard", {
      method: "POST",
      body: formData,
    });
  });

  it("calls approveKyc with application ID and review notes", async () => {
    const mockResponse = { id: "kyc-123", status: "APPROVED" };
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue(mockResponse);

    const result = await approveKyc("kyc-123", "Approved by manager");
    expect(result.status).toBe("APPROVED");
    expect(spy).toHaveBeenCalledWith("/kyc/kyc-123/approve", {
      method: "POST",
      body: JSON.stringify({ notes: "Approved by manager" }),
    });
  });

  it("calls rejectKyc with application ID and rejection reason", async () => {
    const mockResponse = { id: "kyc-123", status: "REJECTED" };
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue(mockResponse);

    const result = await rejectKyc("kyc-123", "Invalid document");
    expect(result.status).toBe("REJECTED");
    expect(spy).toHaveBeenCalledWith("/kyc/kyc-123/reject", {
      method: "POST",
      body: JSON.stringify({ notes: "Invalid document" }),
    });
  });

  it("calls getKycApplications and getPendingKycApplications", async () => {
    const spy = vi.spyOn(client, "apiRequest").mockResolvedValue([{ id: "1" }]);

    const all = await getKycApplications();
    expect(all).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith("/kyc");

    const pending = await getPendingKycApplications();
    expect(pending).toHaveLength(1);
    expect(spy).toHaveBeenCalledWith("/kyc/pending");
  });

  it("fetches real PCI-DSS report and system audit integrity", async () => {
    const spy = vi.spyOn(client, "apiRequest")
      .mockResolvedValueOnce({ complianceScore: 100, fullyCompliant: true })
      .mockResolvedValueOnce({ overallValid: true });

    const report = await getPciDssReport();
    expect(report.complianceScore).toBe(100);
    expect(spy).toHaveBeenCalledWith("/compliance/pci-dss");

    const audit = await verifyAuditIntegrity();
    expect(audit.overallValid).toBe(true);
    expect(spy).toHaveBeenCalledWith("/compliance/audit/verify");
  });
});
