package com.fincore.payment_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.payment_service.event.OutboxEvent;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.event.OutboxRelay;
import com.fincore.payment_service.event.PaymentInitiatedEvent;
import com.fincore.payment_service.payment.PaymentRail;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentOutboxRelayTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutboxRelay outboxRelay;

    @BeforeEach
    void setUp() {
        objectMapper.findAndRegisterModules();
        outboxRelay = new OutboxRelay(outboxEventRepository, kafkaTemplate, objectMapper);
    }

    @Test
    @DisplayName("Payment outbox relay publishes to Kafka and records sent timestamp")
    void relayEventsShouldPublishToKafkaAndMarkSent() throws Exception {
        UUID paymentId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID sourceAccountId = UUID.randomUUID();
        PaymentInitiatedEvent payload = new PaymentInitiatedEvent(
                UUID.randomUUID(), paymentId, customerId, sourceAccountId,
                new BigDecimal("1500.00"), PaymentRail.UPI, "UPI20261118001"
        );
        String json = objectMapper.writeValueAsString(payload);
        OutboxEvent event = new OutboxEvent("Payment", paymentId.toString(), "payment.initiated", json);

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("payment.initiated", 0), 0, 0, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        CompletableFuture<SendResult<String, Object>> future = CompletableFuture.completedFuture(sendResult);

        when(kafkaTemplate.send(eq("payment.initiated"), eq(paymentId.toString()), any(PaymentInitiatedEvent.class)))
                .thenReturn(future);

        outboxRelay.relayEvents();

        assertNotNull(event.getSentAt());
        verify(kafkaTemplate).send(eq("payment.initiated"), eq(paymentId.toString()), any(PaymentInitiatedEvent.class));
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Broker downtime leaves event unsent for next scheduled tick")
    void brokerFailurePreservesUnsentStatus() {
        UUID paymentId = UUID.randomUUID();
        OutboxEvent event = new OutboxEvent("Payment", paymentId.toString(), "payment.initiated", "{}");

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(), any(), any())).thenThrow(new RuntimeException("Broker disconnected"));

        outboxRelay.relayEvents();

        assertNull(event.getSentAt());
        verify(outboxEventRepository, never()).save(event);
    }
}
