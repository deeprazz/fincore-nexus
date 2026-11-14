package com.fincore.loan_service.loan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    List<Loan> findByCustomerId(UUID customerId);
    List<Loan> findByStatus(LoanStatus status);
    List<Loan> findByStatusAndNpaCategory(LoanStatus status, NpaCategory npaCategory);

    @Query("SELECT SUM(l.principalAmount) FROM Loan l WHERE l.status = 'ACTIVE' AND l.disbursedAt IS NOT NULL AND YEAR(l.disbursedAt) = YEAR(CURRENT_TIMESTAMP)")
    BigDecimal sumDisbursedYTD();

    long countByStatus(LoanStatus status);
    long countByNpaCategory(NpaCategory npaCategory);
}
