package com.fincore.kyc_service.event;

import java.time.Instant;
import java.util.UUID;

public record KycApprovedEvent(
        UUID customerId,
        UUID kycApplicationId,
        String fullName,
        String panMasked,
        Instant approvedAt
) {}
