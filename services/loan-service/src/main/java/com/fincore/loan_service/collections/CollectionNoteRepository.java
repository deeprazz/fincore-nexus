package com.fincore.loan_service.collections;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CollectionNoteRepository extends JpaRepository<CollectionNote, UUID> {
    List<CollectionNote> findByLoanIdOrderByCreatedAtDesc(UUID loanId);
}
