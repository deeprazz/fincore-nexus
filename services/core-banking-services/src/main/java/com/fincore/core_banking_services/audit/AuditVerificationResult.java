package com.fincore.core_banking_services.audit;

import java.util.UUID;

public record AuditVerificationResult(
        boolean valid,
        UUID brokenRowId,
        Integer brokenRowIndex,
        String message,
        long verifiedRowsCount
) {}
