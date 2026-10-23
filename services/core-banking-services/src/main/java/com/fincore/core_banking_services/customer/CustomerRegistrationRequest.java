package com.fincore.core_banking_services.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerRegistrationRequest(
        @NotBlank @Size(max=100) String name,
        @NotBlank @Email @Size(max=255) String email,
        @NotBlank @Size(min=8, max=72) String password) {}
