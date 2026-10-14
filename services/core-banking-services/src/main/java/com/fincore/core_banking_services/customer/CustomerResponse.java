package com.fincore.core_banking_services.customer;

import java.time.Instant;
import java.util.UUID;

public record CustomerResponse(UUID id, String name, String email,
                               KycStatus kycStatus, Instant createdAt) {

    static CustomerResponse from(Customer c) {
        return new CustomerResponse(c.getId(), c.getName(), c.getEmail(),
                                    c.getKycStatus(), c.getCreatedAt());
    }
}
