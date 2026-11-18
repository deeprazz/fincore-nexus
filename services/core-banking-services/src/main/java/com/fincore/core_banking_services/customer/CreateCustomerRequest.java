package com.fincore.core_banking_services.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCustomerRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email String email,
        String phoneNumber,
        String aadhaarNumber,
        String panNumber,
        String password) {
    public CreateCustomerRequest(String name, String email) {
        this(name, email, null, null, null, null);
    }
}
