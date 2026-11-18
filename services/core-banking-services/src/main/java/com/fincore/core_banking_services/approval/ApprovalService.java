package com.fincore.core_banking_services.approval;

import com.fincore.core_banking_services.account.AccountService;
import com.fincore.core_banking_services.audit.AuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ApprovalService {

    private final PendingApprovalRepository approvalRepository;
    private final AccountService accountService;
    private final AuditService auditService;
    private final BigDecimal threshold;

    public ApprovalService(
            PendingApprovalRepository approvalRepository,
            AccountService accountService,
            AuditService auditService,
            @Value("${fincore.approval.threshold:200000.00}") BigDecimal threshold) {
        this.approvalRepository = approvalRepository;
        this.accountService = accountService;
        this.auditService = auditService;
        this.threshold = threshold;
    }

    public BigDecimal getThreshold() {
        return threshold;
    }

    public boolean isThresholdExceeded(BigDecimal amount) {
        return amount != null && amount.compareTo(threshold) > 0;
    }

    @Transactional
    public PendingApproval submitPendingApproval(String operationType, UUID fromAccountId, UUID toAccountId,
                                                 BigDecimal amount, String description, String maker) {
        PendingApproval approval = new PendingApproval(operationType, fromAccountId, toAccountId, amount, description, maker);
        PendingApproval saved = approvalRepository.save(approval);
        if (auditService != null) {
            auditService.record("PENDING_APPROVAL_CREATED", "PENDING_APPROVAL", saved.getId(), maker,
                    "type=" + operationType + "; amount=" + amount + "; from=" + fromAccountId);
        }
        return saved;
    }

    public List<PendingApproval> getPendingApprovals() {
        return approvalRepository.findByStatusOrderByCreatedAtDesc("PENDING_APPROVAL");
    }

    public List<PendingApproval> getAllApprovals() {
        return approvalRepository.findAllByOrderByCreatedAtDesc();
    }

    public PendingApproval getById(UUID id) {
        return approvalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Approval request not found"));
    }

    @Transactional
    public PendingApproval approve(UUID id, String checker) {
        PendingApproval approval = getById(id);
        if (!"PENDING_APPROVAL".equalsIgnoreCase(approval.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Operation is not pending approval: " + approval.getStatus());
        }

        // Maker-Checker dual control enforcement: checker cannot equal maker
        if (approval.getMaker() != null && approval.getMaker().equalsIgnoreCase(checker)) {
            if (auditService != null) {
                auditService.record("APPROVAL_SELF_CHECK_BLOCKED", "PENDING_APPROVAL", id, checker,
                        "maker=" + approval.getMaker() + "; checker=" + checker);
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Maker-checker violation: You cannot approve your own transaction (maker: " + approval.getMaker() + ")");
        }

        // Execute transaction (same DB transaction, locking, outbox event)
        if ("WITHDRAWAL".equalsIgnoreCase(approval.getOperationType())) {
            accountService.executeDirectWithdrawal(approval.getFromAccountId(), approval.getAmount());
        } else if ("TRANSFER".equalsIgnoreCase(approval.getOperationType())) {
            accountService.executeDirectTransfer(approval.getFromAccountId(), approval.getToAccountId(), approval.getAmount());
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown operation type: " + approval.getOperationType());
        }

        approval.setStatus("APPROVED");
        approval.setChecker(checker);
        approval.setReviewedAt(Instant.now());
        PendingApproval saved = approvalRepository.save(approval);

        if (auditService != null) {
            auditService.record("PENDING_APPROVAL_APPROVED", "PENDING_APPROVAL", id, checker,
                    "operation=" + approval.getOperationType() + "; amount=" + approval.getAmount());
        }
        return saved;
    }

    @Transactional
    public PendingApproval reject(UUID id, String checker, String reason) {
        PendingApproval approval = getById(id);
        if (!"PENDING_APPROVAL".equalsIgnoreCase(approval.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Operation is not pending approval: " + approval.getStatus());
        }

        if (approval.getMaker() != null && approval.getMaker().equalsIgnoreCase(checker)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Maker-checker violation: You cannot reject your own transaction (maker: " + approval.getMaker() + ")");
        }

        approval.setStatus("REJECTED");
        approval.setChecker(checker);
        approval.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Rejected by manager");
        approval.setReviewedAt(Instant.now());
        PendingApproval saved = approvalRepository.save(approval);

        if (auditService != null) {
            auditService.record("PENDING_APPROVAL_REJECTED", "PENDING_APPROVAL", id, checker,
                    "reason=" + approval.getRejectionReason());
        }
        return saved;
    }
}
