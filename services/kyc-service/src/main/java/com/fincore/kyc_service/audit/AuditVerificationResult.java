package com.fincore.kyc_service.audit;

public record AuditVerificationResult(
        boolean valid,
        long totalEntries,
        Long brokenSequenceNumber,
        String message
) {}
