package com.fincore.core_banking_services.audit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditLogRepository repository;
    private final AuditService auditService;

    public AuditController(AuditLogRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditLog> getRecentAuditEvents() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/verify")
    public ResponseEntity<AuditVerificationResult> verifyChain() {
        return ResponseEntity.ok(auditService.verifyChain());
    }

    @GetMapping("/entity/{entityId}")
    public List<AuditLog> getAuditLogsForEntity(@PathVariable UUID entityId) {
        return repository.findTop5ByEntityIdOrderByCreatedAtDesc(entityId);
    }
}
