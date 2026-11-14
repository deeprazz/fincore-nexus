package com.fincore.payment_service.beneficiary;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, UUID> {
    List<Beneficiary> findByCustomerId(UUID customerId);
    List<Beneficiary> findByCustomerIdAndStatus(UUID customerId, BeneficiaryStatus status);
}
