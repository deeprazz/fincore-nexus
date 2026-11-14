package com.fincore.core_banking_services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.core_banking_services.events.OutboxEvent;
import com.fincore.core_banking_services.events.OutboxEventRepository;
import com.fincore.core_banking_services.events.OutboxRelay;
import com.fincore.core_banking_services.events.TransactionCompletedEvent;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxRelayTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, TransactionCompletedEvent> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutboxRelay outboxRelay;

    @BeforeEach
    void setUp() {
        objectMapper.findAndRegisterModules();
        outboxRelay = new OutboxRelay(outboxEventRepository, kafkaTemplate, objectMapper);
    }

    @Test
    void relayEventsShouldPublishToKafkaAndMarkSent() throws Exception {
        UUID txId = UUID.randomUUID();
        UUID accId = UUID.randomUUID();
        TransactionCompletedEvent payload = new TransactionCompletedEvent(
                txId, accId, "DEPOSIT", new BigDecimal("100.00"), new BigDecimal("1100.00"), null, Instant.now());
        String json = objectMapper.writeValueAsString(payload);

        OutboxEvent event = new OutboxEvent("ACCOUNT", accId.toString(), "transaction.completed", json);

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("transaction.completed", 0), 0, 0, 0, 0, 0);
        SendResult<String, TransactionCompletedEvent> sendResult = new SendResult<>(null, metadata);
        CompletableFuture<SendResult<String, TransactionCompletedEvent>> future = CompletableFuture.completedFuture(sendResult);

        when(kafkaTemplate.send(eq("transaction.completed"), eq(accId.toString()), any(TransactionCompletedEvent.class)))
                .thenReturn(future);

        outboxRelay.relayEvents();

        assertNotNull(event.getSentAt());
        verify(kafkaTemplate).send(eq("transaction.completed"), eq(accId.toString()), any(TransactionCompletedEvent.class));
        verify(outboxEventRepository).save(event);
    }
}
