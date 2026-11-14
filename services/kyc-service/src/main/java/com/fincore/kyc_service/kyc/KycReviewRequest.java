package com.fincore.kyc_service.kyc;

import jakarta.validation.constraints.NotBlank;

public record KycReviewRequest(
        @NotBlank(message = "Review notes are required")
        String notes
) {}
