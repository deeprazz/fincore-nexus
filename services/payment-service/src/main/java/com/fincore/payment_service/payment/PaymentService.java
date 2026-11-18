package com.fincore.payment_service.payment;

import com.fincore.payment_service.audit.PaymentAuditService;
import com.fincore.payment_service.beneficiary.Beneficiary;
import com.fincore.payment_service.beneficiary.BeneficiaryRepository;
import com.fincore.payment_service.beneficiary.BeneficiaryStatus;
import com.fincore.payment_service.client.CoreBankingClient;
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
import org.springframework.kafka.core.KafkaTemplate;
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
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final PaymentAuditService auditService;

    @Value("${fincore.payment.imps-max-limit:500000.00}")
    private BigDecimal impsMaxLimit;

    @Value("${fincore.payment.upi-max-limit:100000.00}")
    private BigDecimal upiMaxLimit;

    @Value("${fincore.payment.neft-max-limit:1000000.00}")
    private BigDecimal neftMaxLimit;

    @Value("${fincore.payment.cooling-off-threshold:50000.00}")
    private BigDecimal coolingOffThreshold;

    @Value("${fincore.payment.cooling-off-minutes:30}")
    private long coolingOffMinutes;

    public PaymentService(PaymentRepository paymentRepository,
                          BeneficiaryRepository beneficiaryRepository,
                          PaymentSagaRepository sagaRepository,
                          FraudDetectionEngine fraudEngine,
                          UtrGenerator utrGenerator,
                          SettlementEngine settlementEngine,
                          CoreBankingClient coreBankingClient,
                          KafkaTemplate<String, Object> kafkaTemplate,
                          PaymentAuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.sagaRepository = sagaRepository;
        this.fraudEngine = fraudEngine;
        this.utrGenerator = utrGenerator;
        this.settlementEngine = settlementEngine;
        this.coreBankingClient = coreBankingClient;
        this.kafkaTemplate = kafkaTemplate;
        this.auditService = auditService;
    }

    public PaymentResponse initiatePayment(PaymentRequest req) {
        // 1. Idempotency Check
        String idempotencyKey = req.getIdempotencyKey();
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            idempotencyKey = "req-" + UUID.randomUUID();
        }
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            log.info("Returning existing payment for idempotencyKey: {}", idempotencyKey);
            return PaymentResponse.from(existing.get());
        }

        // 2. Validate Rail Limits
        validateRailLimits(req.getPaymentRail(), req.getAmount(), req.getTargetVpa());

        // 3. Beneficiary validation & Cooling-off
        Beneficiary beneficiary = null;
        boolean isNewBeneficiary = false;
        boolean isUnverifiedBeneficiary = false;
        if (req.getBeneficiaryId() != null) {
            beneficiary = beneficiaryRepository.findById(req.getBeneficiaryId())
                    .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found: " + req.getBeneficiaryId()));
            
            // Check cooling-off period for high-value transfers
            long minutesSinceCreation = ChronoUnit.MINUTES.between(beneficiary.getCreatedAt(), OffsetDateTime.now());
            if (minutesSinceCreation < coolingOffMinutes && req.getAmount().compareTo(coolingOffThreshold) > 0) {
                throw new IllegalStateException("Beneficiary is in cooling-off period (" +
                        (coolingOffMinutes - minutesSinceCreation) + "m remaining) for transfers exceeding ₹" + coolingOffThreshold);
            }

            isNewBeneficiary = minutesSinceCreation < 1440; // < 24 hours
            isUnverifiedBeneficiary = beneficiary.getStatus() != BeneficiaryStatus.VERIFIED;
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
                isUnverifiedBeneficiary,
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
        payment.setPurpose(req.getPurpose());
        payment.setFraudScore(fraudResult.getScore());
        payment.setFraudDecision(fraudResult.getDecision());
        payment.setTriggeredRules(fraudResult.getTriggeredRulesAsString());
        payment.setStatus(PaymentStatus.INITIATED);

        Payment savedPayment = paymentRepository.save(payment);
        auditService.record("PAYMENT_INITIATED", "Payment", savedPayment.getId(), "user",
                "Payment initiated: rail=" + savedPayment.getPaymentRail() + ", amount=" + savedPayment.getAmount() + ", utr=" + utr);
        auditService.record("FRAUD_DECISION", "Payment", savedPayment.getId(), "fraud-engine",
                "Fraud decision: " + fraudResult.getDecision() + " score=" + fraudResult.getScore() + " rules=" + fraudResult.getTriggeredRulesAsString());

        // Start Saga
        UUID correlationId = UUID.randomUUID();
        PaymentSaga saga = new PaymentSaga();
        saga.setPaymentId(savedPayment.getId());
        saga.setCorrelationId(correlationId);
        saga.setCurrentStep("INITIATED");
        sagaRepository.save(saga);

        // Check Fraud Block
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

            kafkaTemplate.send("payment.failed", utr, new PaymentFailedEvent(
                    correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                    finalPayment.getAmount(), utr, finalPayment.getFailureReason()
            ));
            return PaymentResponse.from(finalPayment);
        }

        // Publish payment.initiated event
        kafkaTemplate.send("payment.initiated", utr, new PaymentInitiatedEvent(
                correlationId, savedPayment.getId(), savedPayment.getCustomerId(),
                savedPayment.getSourceAccountId(), savedPayment.getAmount(),
                savedPayment.getPaymentRail(), utr
        ));

        // 5. Execute SAGA: Step 1: Debit Source Account
        savedPayment.setStatus(PaymentStatus.FRAUD_CHECKED);
        saga.setCurrentStep("DEBIT_REQUESTED");
        sagaRepository.save(saga);

        boolean debitSuccess = coreBankingClient.debitAccount(
                savedPayment.getSourceAccountId(),
                savedPayment.getAmount(),
                "Payment " + utr + " via " + savedPayment.getPaymentRail()
        );

        if (!debitSuccess) {
            savedPayment.setStatus(PaymentStatus.FAILED);
            savedPayment.setFailureReason("Insufficient funds or source account debit rejected");
            saga.setStatus("FAILED");
            saga.setCurrentStep("DEBIT_FAILED");
            saga.setErrorMessage(savedPayment.getFailureReason());
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(savedPayment);
            auditService.record("PAYMENT_FAILED", "Payment", finalPayment.getId(), "core-banking",
                    "Source account debit rejected or insufficient funds: " + savedPayment.getFailureReason());

            kafkaTemplate.send("payment.failed", utr, new PaymentFailedEvent(
                    correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                    finalPayment.getAmount(), utr, finalPayment.getFailureReason()
            ));
            return PaymentResponse.from(finalPayment);
        }

        savedPayment.setStatus(PaymentStatus.DEBITED);
        saga.setCurrentStep("DEBITED");
        sagaRepository.save(saga);
        auditService.record("PAYMENT_DEBITED", "Payment", savedPayment.getId(), "core-banking",
                "Source account debited: amount=" + savedPayment.getAmount() + ", utr=" + utr);

        // 6. Execute SAGA: Step 2: Credit Target Account (or Simulated Clearing Network)
        saga.setCurrentStep("CREDIT_REQUESTED");
        sagaRepository.save(saga);

        // In enterprise digital banking, external clearing network (NPCI / RBI) processes credit.
        // For simulation, external credit succeeds unless target is specifically marked failure.
        boolean creditSuccess = true;
        if ("FAIL_CREDIT".equalsIgnoreCase(savedPayment.getTargetAccountNumber())) {
            creditSuccess = false;
        }

        if (!creditSuccess) {
            // Compensation: Refund the debited amount to source account
            log.warn("Credit failed for payment {}; initiating saga compensation refund", utr);
            coreBankingClient.creditAccount(
                    savedPayment.getSourceAccountId(),
                    savedPayment.getAmount(),
                    "Reversal for failed payment " + utr
            );
            savedPayment.setStatus(PaymentStatus.REVERSED);
            savedPayment.setFailureReason("Destination network rejected credit; funds refunded to source account");
            saga.setStatus("COMPENSATED");
            saga.setCurrentStep("REVERSED");
            saga.setErrorMessage(savedPayment.getFailureReason());
            sagaRepository.save(saga);
            Payment finalPayment = paymentRepository.save(savedPayment);
            auditService.record("PAYMENT_REVERSED", "Payment", finalPayment.getId(), "saga",
                    "Destination credit failed; funds reversed to source account: " + finalPayment.getFailureReason());

            kafkaTemplate.send("payment.failed", utr, new PaymentFailedEvent(
                    correlationId, finalPayment.getId(), finalPayment.getCustomerId(),
                    finalPayment.getAmount(), utr, finalPayment.getFailureReason()
            ));
            return PaymentResponse.from(finalPayment);
        }

        savedPayment.setStatus(PaymentStatus.CREDITED);
        saga.setCurrentStep("CREDITED");
        sagaRepository.save(saga);
        auditService.record("PAYMENT_CREDITED", "Payment", savedPayment.getId(), "clearing-network",
                "Target account credited: amount=" + savedPayment.getAmount() + ", utr=" + utr);

        // 7. Settlement: T+0 for IMPS/UPI, Batch for NEFT
        if (savedPayment.getPaymentRail() == PaymentRail.IMPS || savedPayment.getPaymentRail() == PaymentRail.UPI) {
            settlementEngine.settleInstant(savedPayment);
            saga.setCurrentStep("SETTLED");
        } else {
            log.info("NEFT payment {} queued for batch settlement", utr);
            saga.setCurrentStep("AWAITING_BATCH_SETTLEMENT");
        }

        saga.setStatus("COMPLETED");
        sagaRepository.save(saga);
        Payment finalPayment = paymentRepository.save(savedPayment);
        auditService.record("PAYMENT_SETTLED", "Payment", finalPayment.getId(), "settlement-engine",
                "Payment settled: rail=" + finalPayment.getPaymentRail() + ", utr=" + utr);

        // Publish payment.completed event (Notification Service consumes this!)
        kafkaTemplate.send("payment.completed", utr, new PaymentCompletedEvent(
                correlationId,
                finalPayment.getId(),
                finalPayment.getCustomerId(),
                finalPayment.getSourceAccountId(),
                finalPayment.getTargetAccountNumber() != null ? finalPayment.getTargetAccountNumber() : finalPayment.getTargetVpa(),
                finalPayment.getAmount(),
                finalPayment.getPaymentRail(),
                utr,
                OffsetDateTime.now()
        ));

        return PaymentResponse.from(finalPayment);
    }

    private void validateRailLimits(PaymentRail rail, BigDecimal amount, String vpa) {
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
}
