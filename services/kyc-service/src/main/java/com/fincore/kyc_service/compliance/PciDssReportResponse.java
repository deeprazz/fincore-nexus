package com.fincore.kyc_service.compliance;

import java.time.Instant;
import java.util.List;

public record PciDssReportResponse(
        int totalControls,
        int passedControls,
        double complianceScore,
        boolean fullyCompliant,
        Instant evaluatedAt,
        List<PciControlCheck> controls
) {}
