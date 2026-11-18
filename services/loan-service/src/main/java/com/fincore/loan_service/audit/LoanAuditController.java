package com.fincore.loan_service.audit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/loans/audit")
public class LoanAuditController {

    private final LoanAuditLogRepository repository;
    private final LoanAuditService auditService;

    public LoanAuditController(LoanAuditLogRepository repository, LoanAuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<LoanAuditLog> getRecentAuditLogs() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/verify")
    public ResponseEntity<AuditVerificationResult> verifyChain() {
        return ResponseEntity.ok(auditService.verifyChain());
    }

    @GetMapping("/entity/{entityId}")
    public List<LoanAuditLog> getAuditLogsForEntity(@PathVariable UUID entityId) {
        return repository.findTop5ByEntityIdOrderByCreatedAtDesc(entityId);
    }
}
