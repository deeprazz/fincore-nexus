package com.fincore.payment_service.settlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.payment_service.client.CoreBankingClient;
import com.fincore.payment_service.client.CoreTransactionDto;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.payment.Payment;
import com.fincore.payment_service.payment.PaymentRail;
import com.fincore.payment_service.payment.PaymentRepository;
import com.fincore.payment_service.payment.PaymentStatus;
import com.fincore.payment_service.saga.PaymentSagaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class SettlementEngineReconciliationTest {

    private PaymentRepository paymentRepository;
    private SettlementBatchRepository batchRepository;
    private PaymentSagaRepository sagaRepository;
    private OutboxEventRepository outboxEventRepository;
    private ObjectMapper objectMapper;
    private CoreBankingClient coreBankingClient;
    private SettlementEngine settlementEngine;

    @BeforeEach
    void setUp() {
        paymentRepository = Mockito.mock(PaymentRepository.class);
        batchRepository = Mockito.mock(SettlementBatchRepository.class);
        sagaRepository = Mockito.mock(PaymentSagaRepository.class);
        outboxEventRepository = Mockito.mock(OutboxEventRepository.class);
        objectMapper = new ObjectMapper();
        coreBankingClient = Mockito.mock(CoreBankingClient.class);
        settlementEngine = new SettlementEngine(paymentRepository, batchRepository, sagaRepository, outboxEventRepository, objectMapper, coreBankingClient);
    }

    @Test
    void testReconciliationAllMatched() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = createSettledPayment(paymentId, new BigDecimal("1500.00"), "UTR123");

        CoreTransactionDto coreTx = new CoreTransactionDto(
                UUID.randomUUID(), UUID.randomUUID(), "WITHDRAWAL",
                new BigDecimal("1500.00"), new BigDecimal("8500.00"), paymentId, Instant.now()
        );

        when(paymentRepository.findAll()).thenReturn(List.of(payment));
        when(coreBankingClient.fetchCoreTransactions()).thenReturn(
                new CoreBankingClient.CoreTransactionsResult(true, List.of(coreTx), null, 200)
        );

        ReconciliationReportResponse report = settlementEngine.reconcileWithCoreLedger();

        assertEquals("BALANCED", report.status());
        assertEquals(1, report.matched());
        assertEquals(0, report.missingInCore());
        assertEquals(0, report.amountMismatch());
        assertEquals(0, report.orphanInCore());
        assertTrue(report.discrepancies().isEmpty());
    }

    @Test
    void testReconciliationMissingInCore() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = createSettledPayment(paymentId, new BigDecimal("2000.00"), "UTR456");

        when(paymentRepository.findAll()).thenReturn(List.of(payment));
        when(coreBankingClient.fetchCoreTransactions()).thenReturn(
                new CoreBankingClient.CoreTransactionsResult(true, List.of(), null, 200)
        );

        ReconciliationReportResponse report = settlementEngine.reconcileWithCoreLedger();

        assertEquals("DISCREPANCIES_DETECTED", report.status());
        assertEquals(0, report.matched());
        assertEquals(1, report.missingInCore());
        assertEquals(0, report.amountMismatch());
        assertEquals(0, report.orphanInCore());
        assertEquals(1, report.discrepancies().size());
        assertEquals("MISSING_IN_CORE", report.discrepancies().get(0).discrepancyType());
    }

    @Test
    void testReconciliationAmountMismatch() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = createSettledPayment(paymentId, new BigDecimal("5000.00"), "UTR789");

        CoreTransactionDto coreTx = new CoreTransactionDto(
                UUID.randomUUID(), UUID.randomUUID(), "WITHDRAWAL",
                new BigDecimal("4900.00"), new BigDecimal("5100.00"), paymentId, Instant.now()
        );

        when(paymentRepository.findAll()).thenReturn(List.of(payment));
        when(coreBankingClient.fetchCoreTransactions()).thenReturn(
                new CoreBankingClient.CoreTransactionsResult(true, List.of(coreTx), null, 200)
        );

        ReconciliationReportResponse report = settlementEngine.reconcileWithCoreLedger();

        assertEquals("DISCREPANCIES_DETECTED", report.status());
        assertEquals(0, report.matched());
        assertEquals(0, report.missingInCore());
        assertEquals(1, report.amountMismatch());
        assertEquals(0, report.orphanInCore());
        assertEquals("AMOUNT_MISMATCH", report.discrepancies().get(0).discrepancyType());
    }

    @Test
    void testReconciliationOrphanInCore() {
        UUID orphanPaymentId = UUID.randomUUID();
        CoreTransactionDto orphanTx = new CoreTransactionDto(
                UUID.randomUUID(), UUID.randomUUID(), "WITHDRAWAL",
                new BigDecimal("300.00"), new BigDecimal("9700.00"), orphanPaymentId, Instant.now()
        );

        when(paymentRepository.findAll()).thenReturn(List.of());
        when(coreBankingClient.fetchCoreTransactions()).thenReturn(
                new CoreBankingClient.CoreTransactionsResult(true, List.of(orphanTx), null, 200)
        );

        ReconciliationReportResponse report = settlementEngine.reconcileWithCoreLedger();

        assertEquals("DISCREPANCIES_DETECTED", report.status());
        assertEquals(0, report.matched());
        assertEquals(0, report.missingInCore());
        assertEquals(0, report.amountMismatch());
        assertEquals(1, report.orphanInCore());
        assertEquals("ORPHAN_IN_CORE", report.discrepancies().get(0).discrepancyType());
    }

    @Test
    void testReconciliationCoreBankingUnavailable() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = createSettledPayment(paymentId, new BigDecimal("1000.00"), "UTR999");

        when(paymentRepository.findAll()).thenReturn(List.of(payment));
        when(coreBankingClient.fetchCoreTransactions()).thenReturn(
                new CoreBankingClient.CoreTransactionsResult(false, List.of(), "Connection refused", 503)
        );

        ReconciliationReportResponse report = settlementEngine.reconcileWithCoreLedger();

        assertEquals("CORE_BANKING_UNAVAILABLE", report.status());
        assertEquals(0, report.matched());
        assertEquals(1, report.discrepancies().size());
        assertEquals("CORE_BANKING_UNAVAILABLE", report.discrepancies().get(0).discrepancyType());
    }

    private Payment createSettledPayment(UUID id, BigDecimal amount, String utr) {
        Payment p = new Payment();
        p.setId(id);
        p.setCustomerId(UUID.randomUUID());
        p.setSourceAccountId(UUID.randomUUID());
        p.setTargetAccountNumber("1234567890");
        p.setTargetIfsc("FINC0001234");
        p.setAmount(amount);
        p.setPaymentRail(PaymentRail.IMPS);
        p.setStatus(PaymentStatus.SETTLED);
        p.setUtr(utr);
        p.setSettledAt(OffsetDateTime.now());
        return p;
    }
}