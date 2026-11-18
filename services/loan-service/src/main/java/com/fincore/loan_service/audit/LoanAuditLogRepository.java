package com.fincore.loan_service.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LoanAuditLogRepository extends JpaRepository<LoanAuditLog, UUID> {
    Optional<LoanAuditLog> findFirstByOrderByCreatedAtDesc();
    List<LoanAuditLog> findAllByOrderByCreatedAtAsc();
    List<LoanAuditLog> findTop100ByOrderByCreatedAtDesc();
    List<LoanAuditLog> findTop5ByEntityIdOrderByCreatedAtDesc(UUID entityId);
}
