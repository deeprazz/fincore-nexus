package com.fincore.payment_service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fincore.payment_service.audit.PaymentAuditService;
import com.fincore.payment_service.beneficiary.Beneficiary;
import com.fincore.payment_service.beneficiary.BeneficiaryRepository;
import com.fincore.payment_service.beneficiary.BeneficiaryStatus;
import com.fincore.payment_service.client.CoreBankingClient;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.fraud.FraudAssessmentResult;
import com.fincore.payment_service.fraud.FraudDecision;
import com.fincore.payment_service.fraud.FraudDetectionEngine;
import com.fincore.payment_service.saga.PaymentSaga;
import com.fincore.payment_service.saga.PaymentSagaRepository;
import com.fincore.payment_service.settlement.SettlementEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentServiceTest {

    private PaymentRepository paymentRepository;
    private PaymentSagaRepository sagaRepository;
    private BeneficiaryRepository beneficiaryRepository;
    private FraudDetectionEngine fraudDetectionEngine;
    private SettlementEngine settlementEngine;
    private CoreBankingClient coreBankingClient;
    private PaymentAuditService auditService;
    private OutboxEventRepository outboxEventRepository;
    private ObjectMapper objectMapper;
    private UtrGenerator utrGenerator;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentRepository = Mockito.mock(PaymentRepository.class);
        sagaRepository = Mockito.mock(PaymentSagaRepository.class);
        beneficiaryRepository = Mockito.mock(BeneficiaryRepository.class);
        fraudDetectionEngine = Mockito.mock(FraudDetectionEngine.class);
        settlementEngine = Mockito.mock(SettlementEngine.class);
        coreBankingClient = Mockito.mock(CoreBankingClient.class);
        auditService = Mockito.mock(PaymentAuditService.class);
        outboxEventRepository = Mockito.mock(OutboxEventRepository.class);
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        utrGenerator = new UtrGenerator();

        paymentService = new PaymentService(
                paymentRepository,
                beneficiaryRepository,
                sagaRepository,
                fraudDetectionEngine,
                utrGenerator,
                settlementEngine,
                coreBankingClient,
                auditService,
                outboxEventRepository,
                objectMapper
        );

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        when(sagaRepository.save(any(PaymentSaga.class))).thenAnswer(inv -> {
            PaymentSaga s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
    }

    private PaymentRequest createValidRequest(PaymentRail rail, BigDecimal amount, String idempotencyKey) {
        PaymentRequest req = new PaymentRequest();
        req.setCustomerId(UUID.randomUUID());
        req.setSourceAccountId(UUID.randomUUID());
        req.setTargetAccountNumber("100000000012");
        req.setTargetIfsc("FINC0001234");
        req.setAmount(amount);
        req.setPaymentRail(rail);
        req.setPurpose("Test Transfer");
        req.setIdempotencyKey(idempotencyKey);
        return req;
    }

    @Test
    void testInitiatePayment_imps_happyPath_settlesImmediately() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("1000.00"), "idem-1");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.1000"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertNotNull(res);
        assertEquals(PaymentRail.IMPS, res.paymentRail());
        verify(settlementEngine).settleInstant(any(Payment.class));
        verify(outboxEventRepository, atLeastOnce()).save(any());
    }

    @Test
    void testInitiatePayment_upi_happyPath_settlesImmediately() {
        PaymentRequest req = createValidRequest(PaymentRail.UPI, new BigDecimal("500.00"), "idem-2");
        req.setTargetAccountNumber(null);
        req.setTargetVpa("user@okaxis");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.0000"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertNotNull(res);
        assertEquals(PaymentRail.UPI, res.paymentRail());
        verify(settlementEngine).settleInstant(any(Payment.class));
    }

    @Test
    void testInitiatePayment_neft_happyPath_staysCreditedWithoutImmediateCompletion() {
        PaymentRequest req = createValidRequest(PaymentRail.NEFT, new BigDecimal("25000.00"), "idem-3");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.1500"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertNotNull(res);
        assertEquals(PaymentRail.NEFT, res.paymentRail());
        assertEquals(PaymentStatus.CREDITED, res.status());
        // NEFT must NOT trigger settleInstant
        verify(settlementEngine, never()).settleInstant(any());
    }

    @Test
    void testInitiatePayment_sourceDebitFailure_marksFailed() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("5000.00"), "idem-4");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.0500"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(false);

        PaymentResponse res = paymentService.initiatePayment(req, "teller");
        assertNotNull(res);
        assertEquals(PaymentStatus.FAILED, res.status());
        assertTrue(res.failureReason().contains("Insufficient funds or source account debit rejected"));
    }

    @Test
    void testInitiatePayment_destCreditFailure_refundSuccess_marksReversed() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("2000.00"), "idem-5");
        req.setTargetAccountNumber("FAIL_CREDIT");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.0500"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);
        when(coreBankingClient.creditAccount(any(), any(), any(), any())).thenReturn(true); // refund succeeds

        PaymentResponse res = paymentService.initiatePayment(req, "teller");
        assertNotNull(res);
        assertEquals(PaymentStatus.REVERSED, res.status());
        assertTrue(res.failureReason().contains("funds refunded to source account"));
        verify(coreBankingClient).creditAccount(eq(req.getSourceAccountId()), eq(req.getAmount()), anyString(), any());
    }

    @Test
    void testInitiatePayment_destCreditFailure_refundFailure_marksCompensationPending() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("2000.00"), "idem-6");
        req.setTargetAccountNumber("FAIL_CREDIT");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong()))
                .thenReturn(new FraudAssessmentResult(new BigDecimal("0.0500"), FraudDecision.ALLOW, List.of()));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);
        when(coreBankingClient.creditAccount(any(), any(), any(), any())).thenReturn(false); // refund fails!

        PaymentResponse res = paymentService.initiatePayment(req, "teller");
        assertNotNull(res);
        assertEquals(PaymentStatus.COMPENSATION_PENDING, res.status());
        assertTrue(res.failureReason().contains("refund to source account could not be completed"));
    }

    @Test
    void testRetryCompensation_success() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setSourceAccountId(UUID.randomUUID());
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setStatus(PaymentStatus.COMPENSATION_PENDING);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(coreBankingClient.creditAccount(any(), any(), any(), any())).thenReturn(true);

        PaymentResponse res = paymentService.retryCompensation(paymentId, "manager");

        assertEquals(PaymentStatus.REVERSED, res.status());
        verify(auditService).record(eq("PAYMENT_COMPENSATED_MANUAL_RETRY"), eq("Payment"), eq(paymentId), eq("manager"), anyString());
    }

    @Test
    void testInitiatePayment_fraudReview_entersPendingReview_noDebit() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("250000.00"), "idem-7");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong())).thenReturn(
                new FraudAssessmentResult(new BigDecimal("0.6500"), FraudDecision.REVIEW, List.of("HIGH_AMOUNT_TRANSFER"))
        );

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertNotNull(res);
        assertEquals(PaymentStatus.PENDING_REVIEW, res.status());
        // Crucial: Core Banking debit MUST NOT be invoked when fraud decision is REVIEW!
        verify(coreBankingClient, never()).debitAccount(any(), any(), any(), any());
    }

    @Test
    void testInitiatePayment_fraudBlock_rejectsWithoutDebit() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("500000.00"), "idem-8");

        when(fraudDetectionEngine.evaluate(any(), any(), anyLong(), anyBoolean(), anyBoolean(), any(), anyLong())).thenReturn(
                new FraudAssessmentResult(new BigDecimal("0.9000"), FraudDecision.BLOCK, List.of("HIGH_AMOUNT", "VELOCITY_EXCEEDED"))
        );

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertNotNull(res);
        assertEquals(PaymentStatus.FAILED, res.status());
        assertTrue(res.failureReason().contains("Blocked by fraud detection rules"));
        verify(coreBankingClient, never()).debitAccount(any(), any(), any(), any());
    }

    @Test
    void testInitiatePayment_unverifiedBeneficiary_rejectsTransfer() {
        UUID benId = UUID.randomUUID();
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("1000.00"), "idem-9");
        req.setBeneficiaryId(benId);

        Beneficiary ben = new Beneficiary();
        ben.setId(benId);
        ben.setName("Unverified Test");
        ben.setStatus(BeneficiaryStatus.PENDING);
        ben.setCreatedAt(OffsetDateTime.now().minusHours(2));

        when(beneficiaryRepository.findById(benId)).thenReturn(Optional.of(ben));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                paymentService.initiatePayment(req, "teller")
        );
        assertTrue(ex.getMessage().contains("Simulated penny-drop verification required"));
    }

    @Test
    void testInitiatePayment_coolingOffExceeded_rejectsTransfer() {
        UUID benId = UUID.randomUUID();
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("60000.00"), "idem-10"); // > 50,000 limit
        req.setBeneficiaryId(benId);

        Beneficiary ben = new Beneficiary();
        ben.setId(benId);
        ben.setStatus(BeneficiaryStatus.VERIFIED);
        ben.setCreatedAt(OffsetDateTime.now().minusMinutes(10)); // created 10 minutes ago (< 30 min cooling off)

        when(beneficiaryRepository.findById(benId)).thenReturn(Optional.of(ben));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                paymentService.initiatePayment(req, "teller")
        );
        assertTrue(ex.getMessage().contains("cooling-off period"));
    }

    @Test
    void testInitiatePayment_idempotency_duplicateSamePayloadReturnsExisting() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("1000.00"), "idem-dup");

        Payment existing = new Payment();
        existing.setId(UUID.randomUUID());
        existing.setIdempotencyKey("idem-dup");
        existing.setCustomerId(req.getCustomerId());
        existing.setSourceAccountId(req.getSourceAccountId());
        existing.setTargetAccountNumber(req.getTargetAccountNumber());
        existing.setAmount(req.getAmount());
        existing.setPaymentRail(req.getPaymentRail());
        existing.setStatus(PaymentStatus.SETTLED);

        when(paymentRepository.findByIdempotencyKey("idem-dup")).thenReturn(Optional.of(existing));

        PaymentResponse res = paymentService.initiatePayment(req, "teller");

        assertEquals(existing.getId(), res.id());
        // Verify no duplicate debit was triggered
        verify(coreBankingClient, never()).debitAccount(any(), any(), any(), any());
    }

    @Test
    void testInitiatePayment_idempotency_duplicateDifferentPayloadRejects() {
        PaymentRequest req = createValidRequest(PaymentRail.IMPS, new BigDecimal("1000.00"), "idem-dup-diff");

        Payment existing = new Payment();
        existing.setId(UUID.randomUUID());
        existing.setIdempotencyKey("idem-dup-diff");
        existing.setCustomerId(req.getCustomerId());
        existing.setSourceAccountId(req.getSourceAccountId());
        existing.setTargetAccountNumber(req.getTargetAccountNumber());
        existing.setAmount(new BigDecimal("9999.00")); // different amount!
        existing.setPaymentRail(req.getPaymentRail());

        when(paymentRepository.findByIdempotencyKey("idem-dup-diff")).thenReturn(Optional.of(existing));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                paymentService.initiatePayment(req, "teller")
        );
        assertTrue(ex.getMessage().contains("was already used for a different payment payload"));
    }
}
