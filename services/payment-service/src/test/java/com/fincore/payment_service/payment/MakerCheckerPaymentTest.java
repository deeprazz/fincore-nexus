package com.fincore.payment_service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fincore.payment_service.audit.PaymentAuditService;
import com.fincore.payment_service.beneficiary.BeneficiaryRepository;
import com.fincore.payment_service.client.CoreBankingClient;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.fraud.FraudDetectionEngine;
import com.fincore.payment_service.saga.PaymentSaga;
import com.fincore.payment_service.saga.PaymentSagaRepository;
import com.fincore.payment_service.settlement.SettlementEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MakerCheckerPaymentTest {

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

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(sagaRepository.save(any(PaymentSaga.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Payment createPendingReviewPayment(String createdBy) {
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setCustomerId(UUID.randomUUID());
        p.setSourceAccountId(UUID.randomUUID());
        p.setTargetAccountNumber("100000000012");
        p.setTargetIfsc("FINC0001234");
        p.setAmount(new BigDecimal("250000.00"));
        p.setPaymentRail(PaymentRail.IMPS);
        p.setStatus(PaymentStatus.PENDING_REVIEW);
        p.setCreatedBy(createdBy);
        return p;
    }

    @Test
    void testApproveReviewPayment_managerSuccess() {
        Payment payment = createPendingReviewPayment("teller");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(coreBankingClient.debitAccount(any(), any(), any(), any())).thenReturn(true);

        PaymentResponse res = paymentService.approveReviewPayment(payment.getId(), "manager");

        assertNotNull(res);
        assertEquals("manager", res.reviewedBy());
        assertNotNull(res.reviewedAt());
        verify(coreBankingClient).debitAccount(eq(payment.getSourceAccountId()), eq(payment.getAmount()), anyString(), any());
        verify(settlementEngine).settleInstant(any(Payment.class));
        verify(auditService).record(eq("PAYMENT_APPROVED_BY_CHECKER"), eq("Payment"), eq(payment.getId()), eq("manager"), anyString());
    }

    @Test
    void testApproveReviewPayment_selfApprovalForbidden() {
        Payment payment = createPendingReviewPayment("teller");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));

        // Creator 'teller' tries to approve their own payment -> AccessDeniedException
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                paymentService.approveReviewPayment(payment.getId(), "teller")
        );

        assertTrue(ex.getMessage().contains("Maker-checker violation: You cannot approve your own transaction"));
        // Ensure no funds were debited
        verify(coreBankingClient, never()).debitAccount(any(), any(), any(), any());
    }

    @Test
    void testRejectReviewPayment_managerSuccess() {
        Payment payment = createPendingReviewPayment("teller");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));

        PaymentResponse res = paymentService.rejectReviewPayment(payment.getId(), "Suspicious invoice attached", "manager");

        assertEquals(PaymentStatus.FAILED, res.status());
        assertEquals("manager", res.reviewedBy());
        assertTrue(res.failureReason().contains("Suspicious invoice attached"));
        verify(coreBankingClient, never()).debitAccount(any(), any(), any(), any());
        verify(auditService).record(eq("PAYMENT_REJECTED_BY_CHECKER"), eq("Payment"), eq(payment.getId()), eq("manager"), anyString());
    }

    @Test
    void testRejectReviewPayment_selfRejectionForbidden() {
        Payment payment = createPendingReviewPayment("teller");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                paymentService.rejectReviewPayment(payment.getId(), "Self cancel", "teller")
        );

        assertTrue(ex.getMessage().contains("Maker-checker violation: You cannot reject your own transaction"));
    }
}
