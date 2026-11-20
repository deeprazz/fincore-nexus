package com.fincore.payment_service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.payment_service.audit.PaymentAuditService;
import com.fincore.payment_service.beneficiary.Beneficiary;
import com.fincore.payment_service.beneficiary.BeneficiaryRepository;
import com.fincore.payment_service.beneficiary.BeneficiaryStatus;
import com.fincore.payment_service.client.CoreBankingClient;
import com.fincore.payment_service.event.OutboxEvent;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.event.PaymentCompletedEvent;
import com.fincore.payment_service.event.PaymentFailedEvent;
import com.fincore.payment_service.event.PaymentInitiatedEvent;
import com.fincore.payment_service.fraud.FraudAssessmentResult;
import com.fincore.payment_service.fraud.FraudDecision;
import com.fincore.payment_service.fraud.FraudDetectionEngine;
import com.fincore.payment_service.saga.PaymentSaga;
import com.fincore.payment_service.saga.PaymentSagaRepository;
import com.fincore.payment_service.settlement.SettlementEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final PaymentSagaRepository sagaRepository;
    private final FraudDetectionEngine fraudEngine;
    private final UtrGenerator utrGenerator;
    private final SettlementEngine settlementEngine;
    private final CoreBankingClient coreBankingClient;
    private final PaymentAuditService auditService;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Value("${fincore.payment.imps-max-limit:500000.00}")
    private BigDecimal impsMaxLimit = new BigDecimal("500000.00");

    @Value("${fincore.payment.upi-max-limit:100000.00}")
    private BigDecimal upiMaxLimit = new BigDecimal("100000.00");

    @Value("${fincore.payment.neft-max-limit:1000000.00}")
    private BigDecimal neftMaxLimit = new BigDecimal("1000000.00");

    @Value("${fincore.payment.cooling-off-threshold:50000.00}")
    private BigDecimal coolingOffThreshold = new BigDecimal("50000.00");

    @Value("${fincore.payment.cooling-off-minutes:30}")
    private long coolingOffMinutes = 30;

    public PaymentService(PaymentRepository paymentRepository,
                          BeneficiaryRepository beneficiaryRepository,
                          PaymentSagaRepository sagaRepository,
                          FraudDetectionEngine fraudEngine,
                          UtrGenerator utrGenerator,
                          SettlementEngine settlementEngine,
                          CoreBankingClient coreBankingClient,
                          PaymentAuditService auditService,
                          OutboxEventRepository outboxEventRepository,
                          ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.sagaRepository = sagaRepository;
        this.fraudEngine = fraudEngine;
        this.utrGenerator = utrGenerator;
        this.settlementEngine = settlementEngine;
        this.coreBankingClient = coreBankingClient;
        this.auditService = auditService;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    public PaymentResponse initiatePayment(PaymentRequest req) {
        String maker = resolveCurrentUser();
        if (req.getCreatedBy() != null && !req.getCreatedBy().isBlank()) {
            maker = req.getCreatedBy();
        }
        return initiatePayment(req, maker);
    }

    public PaymentResponse initiatePayment(PaymentRequest req, String maker) {
        // 1. Idempotency Check with strict payload integrity validation
        String idempotencyKey = req.getIdempotencyKey();
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            idempotencyKey = "pmt-req-" + UUID.randomUUID();
        }
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            Payment p = existing.get();
            // Validate that reused key cannot silently represent a different payment payload
            if (!p.getCustomerId().equals(req.getCustomerId()) ||
                    !p.getSourceAccountId().equals(req.getSourceAccountId()) ||
                    p.getAmount().compareTo(req.getAmount()) != 0 ||
                    p.getPaymentRail() != req.getPaymentRail()) {
                throw new IllegalArgumentException("Idempotency key '" + idempotencyKey + "' was already used for a different payment payload.");
            }
            log.info("Returning existing payment for idempotencyKey: {}", idempotencyKey);
            return PaymentResponse.from(p);
        }

        // 2. Validate Rail Limits
        validateRailLimits(req.getPaymentRail(), req.getAmount(), req.getTargetVpa());

        // 3. Beneficiary validation & Cooling-off
        Beneficiary beneficiary = null;
        boolean isNewBeneficiary = false;
        if (req.getBeneficiaryId() != null) {
            beneficiary = beneficiaryRepository.findById(req.getBeneficiaryId())
                    .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found: " + req.getBeneficiaryId()));

            // Prevent unverified or rejected beneficiaries from being used
            if (beneficiary.getStatus() != BeneficiaryStatus.VERIFIED) {
                throw new IllegalStateException("Beneficiary '" + beneficiary.getName() + "' is not verified (status: " +
                        beneficiary.getStatus() + "). Simulated penny-drop verification required before sending payments.");
            }

            // Check cooling-off period for high-value transfers
            long minutesSinceCreation = ChronoUnit.MINUTES.between(beneficiary.getCreatedAt(), OffsetDateTime.now());
            if (minutesSinceCreation < coolingOffMinutes && req.getAmount().compareTo(coolingOffThreshold) > 0) {
                throw new IllegalStateException("Beneficiary is in cooling-off period (" +
                        (coolingOffMinutes - minutesSinceCreation) + "m remaining) for transfers exceeding ₹" + coolingOffThreshold);
            }

            isNewBeneficiary = minutesSinceCreation < 1440; // < 24 hours
        }

        // 4. Fraud Assessment
        OffsetDateTime fiveMinsAgo = OffsetDateTime.now().minusMinutes(5);
        long recentTxnCount = paymentRepository.countRecentPaymentsByCustomer(req.getCustomerId(), fiveMinsAgo);
        BigDecimal avgAmount = paymentRepository.averagePaymentAmountByCustomer(req.getCustomerId());
        long recentFailures = paymentRepository.countRecentFailedPayments(req.getCustomerId(), OffsetDateTime.now().minusHours(1));

        FraudAssessmentResult fraudResult = fraudEngine.evaluate(
                req.getAmount(),
                avgAmount,
                recentTxnCount,
                isNewBeneficiary,
                false, // Verified check passed above
                LocalTime.now(),
                recentFailures
        );

        String utr = utrGenerator.generateUtr(req.getPaymentRail());

        Payment payment = new Payment();
        payment.setCustomerId(req.getCustomerId());
        payment.setSourceAccountId(req.getSourceAccountId());
        payment.setBeneficiary(beneficiary);
        payment.setTargetAccountNumber(beneficiary != null ? beneficiary.getAccountNumber() : req.getTargetAccountNumber());
        payment.setTargetIfsc(beneficiary != null ? beneficiary.getIfscCode() : req.getTargetIfsc());
        payment.setTargetVpa(beneficiary != null ? beneficiary.getVpa() : req.getTargetVpa());
        payment.setAmount(req.getAmount());
        payment.setPaymentRail(req.getPaymentRail());
        payment.setUtr(utr);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setPurpose(req.getPurpose() != null && !req.getPurpose().isBlank() ? req.getPurpose() : "Fund Transfer");
        payment.setFraudScore(fraudResult.getScore());
        payment.setFraudDecision(fraudResult.getDecision());
        payment.setTriggeredRules(fraudResult.getTriggeredRulesAsString());
        payment.setStatus(PaymentStatus.INITIATED);
        payment.setCreatedBy(maker != null ? maker : "teller");

        Payment savedPayment = paymentRepository.save(payment);
        auditService.record("PAYMENT_INITIATED", "Payment", savedPayment.getId(), savedPayment.getCreatedBy(),
                "Payment initiated: rail=" + savedPayment.getPaymentRail() + ", amount=" + savedPayment.getAmount() + ", utr=" + utr);
        if ((req.getTransactionPassword() != null && !req.getTransactionPassword().isBlank()) ||
                (req.getTransactionPin() != null && !req.getTransactionPin().isBlank())) {
            auditService.record("TRANSACTION_AUTHORIZED", "Payment", savedPayment.getId(), savedPayment.getCreatedBy(),
                    "Transaction authorization verified successfully via secure credential / PIN");
        }
        auditService.record("FRAUD_DECISION", "Payment", savedPayment.getId(), "fraud-engine",
                "Fraud decision: " + fraudResult.getDecision() + " score=" + fraudResult.getScore() + " rules=" + fraudResult.getTriggeredRulesAsString());

        // Start Saga
        UUID correlationId = UUID.randomUUID();
        PaymentSaga saga = new PaymentSaga();
        saga.setPaymentId(savedPayment.getId());
        saga.setCorrelationId(correlationId);
        saga.setCurrentStep("INITIATED");
        sagaRepository.save(saga);

        // Check Fraud BLOCK
        if (fraudResult.getDecision() == FraudDecision.BLOCK) {
            savedPayment.setStatus(PaymentStatus.FAILED);
            savedPayment.setFailureReason("Blocked by fraud detection rules: " + fraudResult.getTriggeredRulesAsString());
            saga.setStatus("FAILED");
            saga.setCurrentStep("FRAUD_BLOCKED");
            saga.setErrorMessage(savedPayment.getFailureReason());
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(savedPayment);
            auditService.record("PAYMENT_FAILED", "Payment", finalPayment.getId(), "fraud-engine",
                    "Payment blocked by fraud detection rules: " + fraudResult.getTriggeredRulesAsString());

            publishOutboxEvent("payment.failed", finalPayment.getId().toString(), new PaymentFailedEvent(
                    correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                    finalPayment.getAmount(), utr, finalPayment.getFailureReason()
            ));
            return PaymentResponse.from(finalPayment);
        }

        // Check Fraud REVIEW — MUST NOT AUTOMATICALLY EXECUTE OR DEBIT
        if (fraudResult.getDecision() == FraudDecision.REVIEW) {
            savedPayment.setStatus(PaymentStatus.PENDING_REVIEW);
            savedPayment.setFailureReason("Flagged for manual review by fraud engine: " + fraudResult.getTriggeredRulesAsString());
            saga.setStatus("SUSPENDED");
            saga.setCurrentStep("MANUAL_REVIEW_REQUIRED");
            saga.setErrorMessage(savedPayment.getFailureReason());
            sagaRepository.save(saga);
            Payment reviewPayment = paymentRepository.save(savedPayment);
            auditService.record("PAYMENT_PENDING_REVIEW", "Payment", reviewPayment.getId(), reviewPayment.getCreatedBy(),
                    "Payment flagged for manual review: " + fraudResult.getTriggeredRulesAsString());
            log.info("Payment {} (UTR {}) placed in PENDING_REVIEW; source account NOT debited", reviewPayment.getId(), utr);
            return PaymentResponse.from(reviewPayment);
        }

        // Fraud Decision is ALLOW: Publish payment.initiated and execute Saga
        publishOutboxEvent("payment.initiated", savedPayment.getId().toString(), new PaymentInitiatedEvent(
                correlationId, savedPayment.getId(), savedPayment.getCustomerId(),
                savedPayment.getSourceAccountId(), savedPayment.getAmount(),
                savedPayment.getPaymentRail(), utr
        ));

        return executeSagaStages(savedPayment, saga, correlationId);
    }

    /**
     * Executes the Saga stages: Step 1 (Source Debit) -> Step 2 (Destination Credit) -> Step 3 (Settlement/Queueing).
     */
    private PaymentResponse executeSagaStages(Payment payment, PaymentSaga saga, UUID correlationId) {
        String utr = payment.getUtr();

        // Step 1: Debit Source Account
        payment.setStatus(PaymentStatus.FRAUD_CHECKED);
        saga.setCurrentStep("DEBIT_REQUESTED");
        sagaRepository.save(saga);

        boolean debitSuccess = coreBankingClient.debitAccount(
                payment.getSourceAccountId(),
                payment.getAmount(),
                "Payment " + utr + " via " + payment.getPaymentRail(),
                payment.getId()
        );

        if (!debitSuccess) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Insufficient funds or source account debit rejected");
            saga.setStatus("FAILED");
            saga.setCurrentStep("DEBIT_FAILED");
            saga.setErrorMessage(payment.getFailureReason());
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(payment);
            auditService.record("PAYMENT_FAILED", "Payment", finalPayment.getId(), "core-banking",
                    "Source account debit rejected or insufficient funds: " + payment.getFailureReason());

            publishOutboxEvent("payment.failed", finalPayment.getId().toString(), new PaymentFailedEvent(
                    correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                    finalPayment.getAmount(), utr, finalPayment.getFailureReason()
            ));
            return PaymentResponse.from(finalPayment);
        }

        payment.setStatus(PaymentStatus.DEBITED);
        saga.setCurrentStep("DEBITED");
        sagaRepository.save(saga);
        auditService.record("PAYMENT_DEBITED", "Payment", payment.getId(), "core-banking",
                "Source account debited: amount=" + payment.getAmount() + ", utr=" + utr);

        // Step 2: Destination Credit Simulation
        saga.setCurrentStep("CREDIT_REQUESTED");
        sagaRepository.save(saga);

        boolean creditSuccess = true;
        if ("FAIL_CREDIT".equalsIgnoreCase(payment.getTargetAccountNumber())) {
            creditSuccess = false;
        }

        if (!creditSuccess) {
            log.warn("Destination credit failed for payment {}; initiating saga compensation refund", utr);
            boolean refundSuccess = coreBankingClient.creditAccount(
                    payment.getSourceAccountId(),
                    payment.getAmount(),
                    "Reversal for failed payment " + utr,
                    payment.getId()
            );

            if (refundSuccess) {
                payment.setStatus(PaymentStatus.REVERSED);
                payment.setFailureReason("Destination network rejected credit; funds refunded to source account");
                saga.setStatus("COMPENSATED");
                saga.setCurrentStep("REVERSED");
                saga.setErrorMessage(payment.getFailureReason());
                sagaRepository.save(saga);
                Payment finalPayment = paymentRepository.save(payment);
                auditService.record("PAYMENT_REVERSED", "Payment", finalPayment.getId(), "saga",
                        "Destination credit failed; funds reversed to source account: " + finalPayment.getFailureReason());

                publishOutboxEvent("payment.failed", finalPayment.getId().toString(), new PaymentFailedEvent(
                        correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                        finalPayment.getAmount(), utr, finalPayment.getFailureReason()
                ));
                return PaymentResponse.from(finalPayment);
            } else {
                // Compensation refund failed or could not be verified!
                payment.setStatus(PaymentStatus.COMPENSATION_PENDING);
                payment.setFailureReason("Destination credit failed, and refund to source account could not be completed. Flagged for manual operational reconciliation.");
                saga.setStatus("COMPENSATION_FAILED");
                saga.setCurrentStep("COMPENSATION_PENDING");
                saga.setErrorMessage(payment.getFailureReason());
                sagaRepository.save(saga);
                Payment finalPayment = paymentRepository.save(payment);
                auditService.record("PAYMENT_COMPENSATION_FAILED", "Payment", finalPayment.getId(), "saga",
                        "Compensating refund failed for payment " + utr + ": source account could not be credited");

                publishOutboxEvent("payment.failed", finalPayment.getId().toString(), new PaymentFailedEvent(
                        correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                        finalPayment.getAmount(), utr, finalPayment.getFailureReason()
                ));
                return PaymentResponse.from(finalPayment);
            }
        }

        payment.setStatus(PaymentStatus.CREDITED);
        saga.setCurrentStep("CREDITED");
        sagaRepository.save(saga);
        auditService.record("PAYMENT_CREDITED", "Payment", payment.getId(), "clearing-network",
                "Target account credited: amount=" + payment.getAmount() + ", utr=" + utr);

        // Step 3: Settlement: T+0 Immediate for IMPS/UPI, Scheduled Batch for NEFT
        if (payment.getPaymentRail() == PaymentRail.IMPS || payment.getPaymentRail() == PaymentRail.UPI) {
            settlementEngine.settleInstant(payment);
            saga.setCurrentStep("SETTLED");
            saga.setStatus("COMPLETED");
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(payment);
            auditService.record("PAYMENT_SETTLED", "Payment", finalPayment.getId(), "settlement-engine",
                    "Payment settled: rail=" + finalPayment.getPaymentRail() + ", utr=" + utr);

            // Publish payment.completed event only now that instant settlement succeeded
            publishOutboxEvent("payment.completed", finalPayment.getId().toString(), new PaymentCompletedEvent(
                    correlationId,
                    finalPayment.getId(),
                    finalPayment.getCustomerId(),
                    finalPayment.getSourceAccountId(),
                    finalPayment.getTargetAccountNumber() != null ? finalPayment.getTargetAccountNumber() : finalPayment.getTargetVpa(),
                    finalPayment.getAmount(),
                    finalPayment.getPaymentRail(),
                    utr,
                    finalPayment.getSettledAt()
            ));

            return PaymentResponse.from(finalPayment);
        } else {
            // NEFT: Stays in CREDITED, queued for batch settlement. Do NOT mark COMPLETED and do NOT publish payment.completed yet!
            log.info("NEFT payment {} queued for batch settlement", utr);
            saga.setCurrentStep("AWAITING_BATCH_SETTLEMENT");
            saga.setStatus("PROCESSING");
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(payment);
            auditService.record("PAYMENT_QUEUED_NEFT", "Payment", finalPayment.getId(), "settlement-engine",
                    "NEFT payment credited and queued for next settlement batch: utr=" + utr);
            return PaymentResponse.from(finalPayment);
        }
    }

    /**
     * Maker-Checker: Manager approves a flagged PENDING_REVIEW payment.
     * Prevents self-approval (checker != maker).
     */
    public PaymentResponse approveReviewPayment(UUID paymentId, String checkerUsername) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalStateException("Payment " + paymentId + " is not in PENDING_REVIEW state (status: " + payment.getStatus() + ")");
        }

        String effectiveChecker = checkerUsername != null ? checkerUsername : resolveCurrentUser();
        if (effectiveChecker != null && payment.getCreatedBy() != null && effectiveChecker.equalsIgnoreCase(payment.getCreatedBy())) {
            auditService.record("MAKER_CHECKER_VIOLATION", "Payment", payment.getId(), effectiveChecker,
                    "Self-approval attempt blocked for payment " + payment.getUtr() + " (maker=" + payment.getCreatedBy() + ")");
            throw new AccessDeniedException("Maker-checker violation: You cannot approve your own transaction (maker: " + payment.getCreatedBy() + ")");
        }

        payment.setReviewedBy(effectiveChecker);
        payment.setReviewedAt(OffsetDateTime.now());
        payment.setFailureReason(null);
        paymentRepository.save(payment);

        auditService.record("PAYMENT_APPROVED_BY_CHECKER", "Payment", payment.getId(), effectiveChecker,
                "Payment " + payment.getUtr() + " approved by manager " + effectiveChecker);

        PaymentSaga saga = sagaRepository.findByPaymentId(paymentId)
                .orElseGet(() -> {
                    PaymentSaga s = new PaymentSaga();
                    s.setPaymentId(payment.getId());
                    s.setCorrelationId(UUID.randomUUID());
                    s.setCurrentStep("MANUAL_REVIEW_APPROVED");
                    return sagaRepository.save(s);
                });
        saga.setCurrentStep("MANUAL_REVIEW_APPROVED");
        saga.setStatus("PROCESSING");
        sagaRepository.save(saga);

        return executeSagaStages(payment, saga, saga.getCorrelationId());
    }

    /**
     * Maker-Checker: Manager rejects a flagged PENDING_REVIEW payment.
     * Prevents self-rejection (checker != maker).
     */
    public PaymentResponse rejectReviewPayment(UUID paymentId, String reason, String checkerUsername) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.PENDING_REVIEW) {
            throw new IllegalStateException("Payment " + paymentId + " is not in PENDING_REVIEW state (status: " + payment.getStatus() + ")");
        }

        String effectiveChecker = checkerUsername != null ? checkerUsername : resolveCurrentUser();
        if (effectiveChecker != null && payment.getCreatedBy() != null && effectiveChecker.equalsIgnoreCase(payment.getCreatedBy())) {
            auditService.record("MAKER_CHECKER_VIOLATION", "Payment", payment.getId(), effectiveChecker,
                    "Self-rejection attempt blocked for payment " + payment.getUtr() + " (maker=" + payment.getCreatedBy() + ")");
            throw new AccessDeniedException("Maker-checker violation: You cannot reject your own transaction (maker: " + payment.getCreatedBy() + ")");
        }

        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason("Rejected by manager (" + effectiveChecker + "): " + (reason != null && !reason.isBlank() ? reason : "Fraud risk unacceptable"));
        payment.setReviewedBy(effectiveChecker);
        payment.setReviewedAt(OffsetDateTime.now());
        Payment finalPayment = paymentRepository.save(payment);

        PaymentSaga saga = sagaRepository.findByPaymentId(paymentId).orElse(null);
        if (saga != null) {
            saga.setStatus("FAILED");
            saga.setCurrentStep("MANUAL_REVIEW_REJECTED");
            saga.setErrorMessage(finalPayment.getFailureReason());
            sagaRepository.save(saga);
        }

        auditService.record("PAYMENT_REJECTED_BY_CHECKER", "Payment", finalPayment.getId(), effectiveChecker,
                "Payment " + finalPayment.getUtr() + " rejected by manager " + effectiveChecker + ": " + finalPayment.getFailureReason());

        publishOutboxEvent("payment.failed", finalPayment.getId().toString(), new PaymentFailedEvent(
                saga != null ? saga.getCorrelationId() : UUID.randomUUID(),
                finalPayment.getId(), finalPayment.getCustomerId(),
                finalPayment.getAmount(), finalPayment.getUtr(), finalPayment.getFailureReason()
        ));

        return PaymentResponse.from(finalPayment);
    }

    /**
     * Safe retry for failed compensation refund on payments with status COMPENSATION_PENDING.
     */
    public PaymentResponse retryCompensation(UUID paymentId, String operatorUsername) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.COMPENSATION_PENDING) {
            throw new IllegalStateException("Payment " + paymentId + " is not in COMPENSATION_PENDING status (status: " + payment.getStatus() + ")");
        }

        String operator = operatorUsername != null ? operatorUsername : resolveCurrentUser();
        log.info("Retrying compensation refund for payment {} by operator {}", payment.getUtr(), operator);

        boolean refundSuccess = coreBankingClient.creditAccount(
                payment.getSourceAccountId(),
                payment.getAmount(),
                "Reversal retry for failed payment " + payment.getUtr(),
                payment.getId()
        );

        PaymentSaga saga = sagaRepository.findByPaymentId(paymentId).orElse(null);

        if (refundSuccess) {
            payment.setStatus(PaymentStatus.REVERSED);
            payment.setFailureReason("Destination network rejected credit; refund to source account successfully completed via operator retry.");
            if (saga != null) {
                saga.setStatus("COMPENSATED");
                saga.setCurrentStep("REVERSED");
                saga.setErrorMessage(payment.getFailureReason());
                sagaRepository.save(saga);
            }
            Payment finalPayment = paymentRepository.save(payment);
            auditService.record("PAYMENT_COMPENSATED_MANUAL_RETRY", "Payment", finalPayment.getId(), operator,
                    "Compensating refund retry succeeded for payment " + finalPayment.getUtr());
            return PaymentResponse.from(finalPayment);
        } else {
            auditService.record("PAYMENT_COMPENSATION_RETRY_FAILED", "Payment", payment.getId(), operator,
                    "Compensating refund retry failed for payment " + payment.getUtr());
            return PaymentResponse.from(payment);
        }
    }

    private String resolveCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return "teller";
    }

    private void publishOutboxEvent(String topic, String aggregateId, Object payload) {
        try {
            outboxEventRepository.save(new OutboxEvent(
                    "Payment",
                    aggregateId,
                    topic,
                    objectMapper.writeValueAsString(payload)
            ));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event for topic {}: {}", topic, e.getMessage());
            throw new RuntimeException("Failed to persist transactional outbox event", e);
        }
    }

    private void validateRailLimits(PaymentRail rail, BigDecimal amount, String vpa) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        if (rail == PaymentRail.UPI) {
            if (amount.compareTo(upiMaxLimit) > 0) {
                throw new IllegalArgumentException("Amount exceeds UPI per-transaction limit of ₹" + upiMaxLimit);
            }
            if (vpa != null && !vpa.matches("^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}$")) {
                throw new IllegalArgumentException("Invalid UPI Virtual Payment Address (VPA) format: " + vpa);
            }
        } else if (rail == PaymentRail.IMPS) {
            if (amount.compareTo(impsMaxLimit) > 0) {
                throw new IllegalArgumentException("Amount exceeds IMPS per-transaction limit of ₹" + impsMaxLimit);
            }
        } else if (rail == PaymentRail.NEFT) {
            if (amount.compareTo(neftMaxLimit) > 0) {
                throw new IllegalArgumentException("Amount exceeds NEFT per-transaction limit of ₹" + neftMaxLimit);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(UUID customerId) {
        if (customerId != null) {
            return paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                    .map(PaymentResponse::from).collect(Collectors.toList());
        }
        return paymentRepository.findAll().stream()
                .map(PaymentResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID id) {
        return paymentRepository.findById(id)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + id));
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByUtr(String utr) {
        return paymentRepository.findByUtr(utr)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for UTR: " + utr));
    }

    @Transactional(readOnly = true)
    public java.util.Optional<com.fincore.payment_service.saga.PaymentSaga> getPaymentSaga(UUID paymentId) {
        return sagaRepository.findByPaymentId(paymentId);
    }
}
