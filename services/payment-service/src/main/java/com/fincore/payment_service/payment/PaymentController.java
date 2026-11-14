package com.fincore.payment_service.payment;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> initiatePayment(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
            @Valid @RequestBody PaymentRequest req) {
        if (idempotencyHeader != null && !idempotencyHeader.isBlank() && req.getIdempotencyKey() == null) {
            req.setIdempotencyKey(idempotencyHeader);
        }
        return ResponseEntity.ok(paymentService.initiatePayment(req));
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
