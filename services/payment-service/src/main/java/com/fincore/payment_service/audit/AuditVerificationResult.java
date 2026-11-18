package com.fincore.payment_service.audit;

import java.util.UUID;

public record AuditVerificationResult(
        boolean valid,
        UUID brokenEntityId,
        Integer brokenSequenceNumber,
        String message,
        int totalEntries
) {
}
