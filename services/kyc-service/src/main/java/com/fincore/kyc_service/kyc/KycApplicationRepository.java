package com.fincore.kyc_service.kyc;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycApplicationRepository extends JpaRepository<KycApplication, UUID> {
    List<KycApplication> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<KycApplication> findByStatusOrderByCreatedAtDesc(KycStatus status);
    List<KycApplication> findAllByOrderByCreatedAtDesc();
    Optional<KycApplication> findFirstByPanHash(String panHash);
}
