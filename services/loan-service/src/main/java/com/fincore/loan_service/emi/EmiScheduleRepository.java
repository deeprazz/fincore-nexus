package com.fincore.loan_service.emi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EmiScheduleRepository extends JpaRepository<EmiSchedule, UUID> {
    List<EmiSchedule> findByLoanIdOrderByInstallmentNumberAsc(UUID loanId);
    List<EmiSchedule> findByLoanIdAndStatus(UUID loanId, EmiStatus status);

    @Query("SELECT e FROM EmiSchedule e WHERE e.dueDate <= :today AND e.status = 'PENDING'")
    List<EmiSchedule> findDueEmis(@Param("today") LocalDate today);

    @Query("SELECT e FROM EmiSchedule e WHERE e.status = 'OVERDUE'")
    List<EmiSchedule> findOverdueEmis();
}
