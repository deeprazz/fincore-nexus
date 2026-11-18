package com.fincore.core_banking_services.approval;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @GetMapping
    public ResponseEntity<List<PendingApproval>> list(
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        List<PendingApproval> list = all
                ? approvalService.getAllApprovals()
                : approvalService.getPendingApprovals();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PendingApproval> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(approvalService.getById(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PendingApproval> approve(
            @PathVariable UUID id,
            Authentication auth) {
        String checker = auth != null ? auth.getName() : "manager";
        return ResponseEntity.ok(approvalService.approve(id, checker));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<PendingApproval> reject(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String checker = auth != null ? auth.getName() : "manager";
        String reason = body != null ? body.get("reason") : "Rejected by manager";
        return ResponseEntity.ok(approvalService.reject(id, checker, reason));
    }
}
