package com.fincore.kyc_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.kyc_service.event.KycApprovedEvent;
import com.fincore.kyc_service.event.OutboxEvent;
import com.fincore.kyc_service.event.OutboxEventRepository;
import com.fincore.kyc_service.event.OutboxRelay;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KycOutboxRelayTest {

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
    @DisplayName("KYC outbox relay publishes to Kafka and records sent timestamp")
    void relayEventsShouldPublishToKafkaAndMarkSent() throws Exception {
        UUID customerId = UUID.randomUUID();
        UUID kycId = UUID.randomUUID();
        KycApprovedEvent payload = new KycApprovedEvent(
                customerId, kycId, "Aarav Sharma", "ABCXXXX34F", Instant.now()
        );
        String json = objectMapper.writeValueAsString(payload);
        OutboxEvent event = new OutboxEvent("Customer", customerId.toString(), "kyc.approved", json);

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("kyc.approved", 0), 0, 0, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        CompletableFuture<SendResult<String, Object>> future = CompletableFuture.completedFuture(sendResult);

        when(kafkaTemplate.send(eq("kyc.approved"), eq(customerId.toString()), any(KycApprovedEvent.class)))
                .thenReturn(future);

        outboxRelay.relayEvents();

        assertNotNull(event.getSentAt());
        verify(kafkaTemplate).send(eq("kyc.approved"), eq(customerId.toString()), any(KycApprovedEvent.class));
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Kafka broker downtime preserves unsent status for next scheduled tick")
    void brokerFailurePreservesUnsentStatus() {
        UUID customerId = UUID.randomUUID();
        OutboxEvent event = new OutboxEvent("Customer", customerId.toString(), "kyc.approved", "{}");

        when(outboxEventRepository.findUnsentEvents()).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(), any(), any())).thenThrow(new RuntimeException("Kafka connection refused"));

        outboxRelay.relayEvents();

        assertNull(event.getSentAt());
        verify(outboxEventRepository, never()).save(event);
    }
}
