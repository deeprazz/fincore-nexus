package com.fincore.kyc_service.kyc;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record KycOnboardRequest(
        @NotNull(message = "Customer ID is required")
        UUID customerId,

        @NotBlank(message = "Full name is required")
        String fullName,

        @NotNull(message = "Date of birth is required")
        LocalDate dateOfBirth,

        @NotBlank(message = "PAN number is required")
        String panNumber,

        @NotBlank(message = "Aadhaar number is required")
        String aadhaarNumber,

        String livenessChallenge
) {}
