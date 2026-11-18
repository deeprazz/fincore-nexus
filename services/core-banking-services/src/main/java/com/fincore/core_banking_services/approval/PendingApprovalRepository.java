package com.fincore.core_banking_services.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PendingApprovalRepository extends JpaRepository<PendingApproval, UUID> {
    List<PendingApproval> findByStatusOrderByCreatedAtDesc(String status);
    List<PendingApproval> findAllByOrderByCreatedAtDesc();
}
