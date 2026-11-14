package com.fincore.payment_service.beneficiary;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BeneficiaryResponse(
        UUID id,
        UUID customerId,
        String accountNumber,
        String ifscCode,
        String name,
        String email,
        String phone,
        String vpa,
        String bankName,
        BeneficiaryStatus status,
        OffsetDateTime verifiedAt,
        OffsetDateTime createdAt
) {
    public static BeneficiaryResponse from(Beneficiary b) {
        return new BeneficiaryResponse(
                b.getId(),
                b.getCustomerId(),
                b.getAccountNumber(),
                b.getIfscCode(),
                b.getName(),
                b.getEmail(),
                b.getPhone(),
                b.getVpa(),
                b.getBankName(),
                b.getStatus(),
                b.getVerifiedAt(),
                b.getCreatedAt()
        );
    }
}
