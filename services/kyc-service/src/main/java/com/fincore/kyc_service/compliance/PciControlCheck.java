package com.fincore.kyc_service.compliance;

public record PciControlCheck(
        String controlId,
        String title,
        String description,
        boolean passed,
        String status,
        String evidence
) {}
