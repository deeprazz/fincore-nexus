package com.fincore.kyc_service.event;

import java.time.Instant;
import java.util.UUID;

public record KycRejectedEvent(
        UUID customerId,
        UUID kycApplicationId,
        String reason,
        Instant rejectedAt
) {}
