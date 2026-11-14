package com.fincore.loan_service.collections;

import com.fincore.loan_service.emi.EmiScheduleRepository;
import com.fincore.loan_service.emi.EmiStatus;
import com.fincore.loan_service.loan.Loan;
import com.fincore.loan_service.loan.LoanRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/loans/collections")
public class CollectionsController {

    private final LoanRepository loanRepository;
    private final EmiScheduleRepository emiScheduleRepository;
    private final CollectionNoteRepository collectionNoteRepository;

    public CollectionsController(LoanRepository loanRepository,
                                 EmiScheduleRepository emiScheduleRepository,
                                 CollectionNoteRepository collectionNoteRepository) {
        this.loanRepository = loanRepository;
        this.emiScheduleRepository = emiScheduleRepository;
        this.collectionNoteRepository = collectionNoteRepository;
    }

    @GetMapping("/overdue")
    public List<Map<String, Object>> getOverdueLoans() {
        return emiScheduleRepository.findOverdueEmis().stream()
                .map(emi -> {
                    Loan loan = loanRepository.findById(emi.getLoanId()).orElse(null);
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("loanId", emi.getLoanId());
                    map.put("emiId", emi.getId());
                    map.put("customerId", loan != null ? loan.getCustomerId() : "unknown");
                    map.put("dueDate", emi.getDueDate().toString());
                    map.put("emiAmount", emi.getEmiAmount());
                    map.put("daysOverdue", emi.getDaysOverdue());
                    map.put("penaltyAmount", emi.getPenaltyAmount());
                    return map;
                })
                .collect(Collectors.toList());
    }

    @PostMapping("/{loanId}/notes")
    public ResponseEntity<CollectionNote> addNote(
            @PathVariable UUID loanId,
            @Valid @RequestBody CollectionNoteRequest req,
            Authentication auth) {
        CollectionNote note = new CollectionNote();
        note.setLoanId(loanId);
        note.setOfficerId(auth.getName());
        note.setNote(req.getNote());
        note.setActionTaken(req.getActionTaken());
        return ResponseEntity.ok(collectionNoteRepository.save(note));
    }

    @GetMapping("/{loanId}/notes")
    public List<CollectionNote> getNotes(@PathVariable UUID loanId) {
        return collectionNoteRepository.findByLoanIdOrderByCreatedAtDesc(loanId);
    }
}
