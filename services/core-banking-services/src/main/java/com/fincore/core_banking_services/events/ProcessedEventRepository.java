package com.fincore.core_banking_services.events;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, UUID> {
    Optional<ProcessedEvent> findByIdempotencyKey(String key);
    boolean existsByIdempotencyKey(String key);
}
