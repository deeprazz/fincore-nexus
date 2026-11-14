import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskPanel, { RiskBadge } from "../features/kyc/RiskPanel";
import OcrResultPanel from "../features/kyc/OcrResultPanel";
import FaceMatchPanel from "../features/kyc/FaceMatchPanel";
import ComplianceChecklist from "../features/compliance/ComplianceChecklist";

vi.mock("../api/kyc", () => ({
  getPciDssReport: vi.fn().mockResolvedValue({
    totalControls: 6,
    passedControls: 6,
    complianceScore: 100,
    fullyCompliant: true,
    controls: [
      {
        controlId: "PCI-DSS-3.2",
        title: "Sensitive Authentication Data Protection",
        description: "Do not store card CVV or PIN blocks.",
        passed: true,
        evidence: "Zero cardholder CVV or raw PIN columns in schema.",
      },
      {
        controlId: "PCI-DSS-3.5",
        title: "Data Encryption at Rest",
        description: "AES-256-GCM encrypted storage.",
        passed: true,
        evidence: "AES-256-GCM cipher active with randomized IV.",
      },
    ],
  }),
}));

describe("KYC & Compliance Components", () => {
  it("renders RiskBadge with appropriate styling", () => {
    const { rerender } = render(<RiskBadge level="LOW" />);
    expect(screen.getByText("Low Risk")).toBeInTheDocument();

    rerender(<RiskBadge level="MEDIUM" />);
    expect(screen.getByText("Medium Risk")).toBeInTheDocument();

    rerender(<RiskBadge level="HIGH" />);
    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });

  it("renders RiskPanel with calculated score and watchlist checks", () => {
    const mockApp = {
      riskLevel: "MEDIUM",
      riskScore: 0.45,
      pepMatch: true,
      sanctionsMatch: false,
      riskReasons: "Elevated: Applicant identified as PEP; Minor applicant",
    };

    render(<RiskPanel application={mockApp} />);
    expect(screen.getByText("Risk & Compliance Assessment")).toBeInTheDocument();
    expect(screen.getByText("0.45")).toBeInTheDocument();
    expect(screen.getByText("PEP Identified")).toBeInTheDocument();
    expect(screen.getByText("Clear / Unrestricted")).toBeInTheDocument();
    expect(screen.getByText(/Elevated: Applicant identified as PEP/)).toBeInTheDocument();
  });

  it("renders OcrResultPanel with confidence and field verification", () => {
    const mockApp = {
      ocrStatus: "VERIFIED",
      ocrConfidence: 96.5,
      extractedPan: "ABCDE1234F",
      extractedName: "Aarav Sharma",
      panNumberMasked: "ABCXXXX34F",
      fullName: "Aarav Sharma",
    };

    render(<OcrResultPanel application={mockApp} />);
    expect(screen.getByText("OCR Extraction & Verification")).toBeInTheDocument();
    expect(screen.getByText("96.5%")).toBeInTheDocument();
    expect(screen.getByText("ABCDE1234F")).toBeInTheDocument();
  });

  it("renders FaceMatchPanel with similarity score and liveness", () => {
    const mockApp = {
      faceMatchStatus: "MATCHED",
      faceMatchConfidence: 94.8,
      livenessVerified: true,
    };

    render(<FaceMatchPanel application={mockApp} />);
    expect(screen.getByText("Biometric & Facial Verification")).toBeInTheDocument();
    expect(screen.getByText("94.8%")).toBeInTheDocument();
    expect(screen.getByText("Passive & Optical Liveness Confirmed")).toBeInTheDocument();
  });

  it("renders ComplianceChecklist with evaluated controls and score", async () => {
    render(<ComplianceChecklist />);
    expect(await screen.findByText("PCI-DSS Regulatory Self-Assessment")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("PCI-DSS-3.2")).toBeInTheDocument();
    expect(screen.getByText("Sensitive Authentication Data Protection")).toBeInTheDocument();
  });
});
