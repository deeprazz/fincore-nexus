package com.fincore.payment_service.settlement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SettlementBatchRepository extends JpaRepository<SettlementBatch, UUID> {
    Optional<SettlementBatch> findByBatchReference(String batchReference);
    List<SettlementBatch> findByStatus(SettlementStatus status);
}
