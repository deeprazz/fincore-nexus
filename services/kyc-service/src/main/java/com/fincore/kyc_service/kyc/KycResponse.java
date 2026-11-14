package com.fincore.kyc_service.kyc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record KycResponse(
        UUID id,
        UUID customerId,
        String fullName,
        LocalDate dateOfBirth,
        String panNumberMasked,
        String aadhaarMasked,
        KycStatus status,
        String ocrStatus,
        BigDecimal ocrConfidence,
        String extractedPan,
        String extractedName,
        String faceMatchStatus,
        BigDecimal faceMatchConfidence,
        boolean livenessVerified,
        RiskLevel riskLevel,
        BigDecimal riskScore,
        boolean pepMatch,
        boolean sanctionsMatch,
        String riskReasons,
        String submittedBy,
        String reviewedBy,
        String reviewNotes,
        Instant createdAt,
        Instant updatedAt,
        List<KycDocumentResponse> documents
) {
    public static KycResponse from(KycApplication app) {
        List<KycDocumentResponse> docResponses = app.getDocuments() != null
                ? app.getDocuments().stream()
                    .map(d -> new KycDocumentResponse(
                            d.getId(),
                            d.getDocumentType(),
                            d.getFileName(),
                            d.getContentType(),
                            d.getFileSize(),
                            d.getCreatedAt()
                    ))
                    .toList()
                : List.of();

        return new KycResponse(
                app.getId(),
                app.getCustomerId(),
                app.getFullName(),
                app.getDateOfBirth(),
                app.getPanNumberMasked(),
                "XXXX-XXXX-" + app.getAadhaarLast4(),
                app.getStatus(),
                app.getOcrStatus(),
                app.getOcrConfidence(),
                app.getExtractedPan(),
                app.getExtractedName(),
                app.getFaceMatchStatus(),
                app.getFaceMatchConfidence(),
                app.isLivenessVerified(),
                app.getRiskLevel(),
                app.getRiskScore(),
                app.isPepMatch(),
                app.isSanctionsMatch(),
                app.getRiskReasons(),
                app.getSubmittedBy(),
                app.getReviewedBy(),
                app.getReviewNotes(),
                app.getCreatedAt(),
                app.getUpdatedAt(),
                docResponses
        );
    }
}
