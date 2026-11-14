package com.fincore.loan_service.event;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LoanEventRepository extends JpaRepository<LoanEvent, UUID> {
    List<LoanEvent> findByLoanIdOrderByCreatedAtAsc(UUID loanId);
}
