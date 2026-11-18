package com.fincore.payment_service.audit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments/audit")
public class PaymentAuditController {

    private final PaymentAuditLogRepository repository;
    private final PaymentAuditService auditService;

    public PaymentAuditController(PaymentAuditLogRepository repository, PaymentAuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<PaymentAuditLog> getRecentAuditLogs() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/verify")
    public ResponseEntity<AuditVerificationResult> verifyChain() {
        return ResponseEntity.ok(auditService.verifyChain());
    }

    @GetMapping("/entity/{entityId}")
    public List<PaymentAuditLog> getAuditLogsForEntity(@PathVariable UUID entityId) {
        return repository.findTop5ByEntityIdOrderByCreatedAtDesc(entityId);
    }
}
