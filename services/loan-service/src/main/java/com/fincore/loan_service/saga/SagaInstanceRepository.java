package com.fincore.loan_service.saga;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SagaInstanceRepository extends JpaRepository<SagaInstance, UUID> {
    Optional<SagaInstance> findByCorrelationId(UUID correlationId);
    List<SagaInstance> findByLoanId(UUID loanId);
}
