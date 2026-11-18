package com.fincore.loan_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.loan_service.event.LoanApprovedEvent;
import com.fincore.loan_service.event.OutboxEvent;
import com.fincore.loan_service.event.OutboxEventRepository;
import com.fincore.loan_service.event.OutboxRelay;
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
class LoanOutboxRelayTest {

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
    @DisplayName("Outbox relay publishes unsent events and marks them sent with timestamp")
    void relayEventsShouldPublishToKafkaAndMarkSent() throws Exception {
        UUID loanId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        LoanApprovedEvent payload = new LoanApprovedEvent(
                UUID.randomUUID(), loanId, customerId, null, new BigDecimal("50000.00"), "INR"
        );
        String json = objectMapper.writeValueAsString(payload);
        OutboxEvent event = new OutboxEvent("Loan", loanId.toString(), "loan.approved", json);

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("loan.approved", 0), 0, 0, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        CompletableFuture<SendResult<String, Object>> future = CompletableFuture.completedFuture(sendResult);

        when(kafkaTemplate.send(eq("loan.approved"), eq(loanId.toString()), any(LoanApprovedEvent.class)))
                .thenReturn(future);

        outboxRelay.relayEvents();

        assertNotNull(event.getSentAt());
        verify(kafkaTemplate).send(eq("loan.approved"), eq(loanId.toString()), any(LoanApprovedEvent.class));
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Kafka failure leaves event unsent for next scheduled relay tick")
    void brokerFailurePreservesUnsentStatusForNextTick() {
        UUID loanId = UUID.randomUUID();
        OutboxEvent event = new OutboxEvent("Loan", loanId.toString(), "loan.approved", "{}");

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(), any(), any())).thenThrow(new RuntimeException("Kafka broker unreachable"));

        outboxRelay.relayEvents();

        assertNull(event.getSentAt());
        verify(outboxEventRepository, never()).save(event);
    }
}
