package com.fincore.loan_service.loan;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, UUID> {
    List<LoanApplication> findByCustomerId(UUID customerId);
    List<LoanApplication> findByStatus(ApplicationStatus status);
}
