package com.fincore.payment_service.payment;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final com.fincore.payment_service.settlement.SettlementEngine settlementEngine;

    public PaymentController(PaymentService paymentService,
                             com.fincore.payment_service.settlement.SettlementEngine settlementEngine) {
        this.paymentService = paymentService;
        this.settlementEngine = settlementEngine;
    }

    @GetMapping("/reconciliation")
    public ResponseEntity<com.fincore.payment_service.settlement.ReconciliationReportResponse> getReconciliation() {
        return ResponseEntity.ok(settlementEngine.reconcileWithCoreLedger());
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> initiatePayment(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
            @Valid @RequestBody PaymentRequest req,
            Authentication auth) {
        if (idempotencyHeader != null && !idempotencyHeader.isBlank() && req.getIdempotencyKey() == null) {
            req.setIdempotencyKey(idempotencyHeader);
        }
        String maker = (auth != null && auth.getName() != null && !auth.getName().isBlank()) ? auth.getName() : "teller";
        if (req.getCreatedBy() == null || req.getCreatedBy().isBlank()) {
            req.setCreatedBy(maker);
        }
        return ResponseEntity.ok(paymentService.initiatePayment(req, req.getCreatedBy()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PaymentResponse> approvePayment(
            @PathVariable UUID id,
            Authentication auth) {
        String checker = (auth != null && auth.getName() != null) ? auth.getName() : "manager";
        return ResponseEntity.ok(paymentService.approveReviewPayment(id, checker));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<PaymentResponse> rejectPayment(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String reason = (body != null && body.containsKey("reason")) ? body.get("reason") : "Fraud risk unacceptable";
        String checker = (auth != null && auth.getName() != null) ? auth.getName() : "manager";
        return ResponseEntity.ok(paymentService.rejectReviewPayment(id, reason, checker));
    }

    @PostMapping("/{id}/retry-compensation")
    public ResponseEntity<PaymentResponse> retryCompensation(
            @PathVariable UUID id,
            Authentication auth) {
        String operator = (auth != null && auth.getName() != null) ? auth.getName() : "manager";
        return ResponseEntity.ok(paymentService.retryCompensation(id, operator));
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> listPayments(@RequestParam(required = false) UUID customerId) {
        return ResponseEntity.ok(paymentService.getPayments(customerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/utr/{utr}")
    public ResponseEntity<PaymentResponse> getPaymentByUtr(@PathVariable String utr) {
        return ResponseEntity.ok(paymentService.getPaymentByUtr(utr));
    }
}
