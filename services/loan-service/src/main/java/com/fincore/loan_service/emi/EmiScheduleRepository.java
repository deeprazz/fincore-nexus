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

    @Query("SELECT e FROM EmiSchedule e WHERE e.dueDate <= :today AND e.status = com.fincore.loan_service.emi.EmiStatus.PENDING")
    List<EmiSchedule> findDueEmis(@Param("today") LocalDate today);

    List<EmiSchedule> findByStatus(EmiStatus status);

    default List<EmiSchedule> findOverdueEmis() {
        return findByStatus(EmiStatus.OVERDUE);
    }
}
