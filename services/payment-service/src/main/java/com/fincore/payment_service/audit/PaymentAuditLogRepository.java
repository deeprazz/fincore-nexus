package com.fincore.payment_service.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentAuditLogRepository extends JpaRepository<PaymentAuditLog, UUID> {
    Optional<PaymentAuditLog> findFirstByOrderByCreatedAtDesc();
    List<PaymentAuditLog> findAllByOrderByCreatedAtAsc();
    List<PaymentAuditLog> findTop100ByOrderByCreatedAtDesc();
    List<PaymentAuditLog> findTop5ByEntityIdOrderByCreatedAtDesc(UUID entityId);
}
