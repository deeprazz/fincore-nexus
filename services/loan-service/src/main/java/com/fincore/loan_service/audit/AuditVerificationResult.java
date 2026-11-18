package com.fincore.loan_service.audit;

import java.util.UUID;

public record AuditVerificationResult(
        boolean valid,
        UUID brokenEntityId,
        Integer brokenSequenceNumber,
        String message,
        int totalEntries
) {
}
