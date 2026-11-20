package com.fincore.payment_service.settlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.payment_service.client.CoreBankingClient;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.payment.Payment;
import com.fincore.payment_service.payment.PaymentRail;
import com.fincore.payment_service.payment.PaymentRepository;
import com.fincore.payment_service.payment.PaymentStatus;
import com.fincore.payment_service.saga.PaymentSaga;
import com.fincore.payment_service.saga.PaymentSagaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SettlementEngineTest {

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
        objectMapper = new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        coreBankingClient = Mockito.mock(CoreBankingClient.class);

        settlementEngine = new SettlementEngine(
                paymentRepository,
                batchRepository,
                sagaRepository,
                outboxEventRepository,
                objectMapper,
                coreBankingClient
        );
    }

    @Test
    void testProcessNeftBatch_settlesPendingPaymentsAndCompletesSagas() {
        UUID p1Id = UUID.randomUUID();
        Payment p1 = new Payment();
        p1.setId(p1Id);
        p1.setPaymentRail(PaymentRail.NEFT);
        p1.setStatus(PaymentStatus.CREDITED);
        p1.setAmount(new BigDecimal("10000.00"));
        p1.setUtr("UTR-NEFT-1");

        UUID p2Id = UUID.randomUUID();
        Payment p2 = new Payment();
        p2.setId(p2Id);
        p2.setPaymentRail(PaymentRail.NEFT);
        p2.setStatus(PaymentStatus.CREDITED);
        p2.setAmount(new BigDecimal("20000.00"));
        p2.setUtr("UTR-NEFT-2");

        PaymentSaga saga1 = new PaymentSaga();
        saga1.setPaymentId(p1Id);
        saga1.setStatus("IN_PROGRESS");

        PaymentSaga saga2 = new PaymentSaga();
        saga2.setPaymentId(p2Id);
        saga2.setStatus("IN_PROGRESS");

        when(paymentRepository.findByPaymentRailAndStatus(PaymentRail.NEFT, PaymentStatus.CREDITED))
                .thenReturn(List.of(p1, p2));
        when(sagaRepository.findByPaymentId(p1Id)).thenReturn(Optional.of(saga1));
        when(sagaRepository.findByPaymentId(p2Id)).thenReturn(Optional.of(saga2));
        when(batchRepository.save(any(SettlementBatch.class))).thenAnswer(inv -> inv.getArgument(0));

        SettlementBatch batch = settlementEngine.processNeftBatch();

        assertNotNull(batch);
        assertEquals(2, batch.getTotalTransactions());
        assertEquals(new BigDecimal("30000.00"), batch.getTotalAmount());
        assertEquals(PaymentStatus.SETTLED, p1.getStatus());
        assertEquals(PaymentStatus.SETTLED, p2.getStatus());
        assertEquals("COMPLETED", saga1.getStatus());
        assertEquals("SETTLED", saga1.getCurrentStep());

        // Verify outbox events were created for both completed and settled for each payment (4 total)
        verify(outboxEventRepository, times(4)).save(any());
    }

    @Test
    void testProcessNeftBatch_noPending_returnsNull() {
        when(paymentRepository.findByPaymentRailAndStatus(PaymentRail.NEFT, PaymentStatus.CREDITED))
                .thenReturn(List.of());

        SettlementBatch batch = settlementEngine.processNeftBatch();
        assertNull(batch);
        verify(batchRepository, never()).save(any());
    }
}
