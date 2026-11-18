package com.fincore.payment_service.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public OutboxRelay(OutboxEventRepository outboxEventRepository,
                       KafkaTemplate<String, Object> kafkaTemplate,
                       ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelay = 500)
    @Transactional
    public void relayEvents() {
        List<OutboxEvent> unsent = outboxEventRepository.findUnsentEvents();
        if (unsent.isEmpty()) {
            return;
        }

        for (OutboxEvent event : unsent) {
            try {
                if ("payment.initiated".equals(event.getEventType())) {
                    PaymentInitiatedEvent payload = objectMapper.readValue(event.getPayload(), PaymentInitiatedEvent.class);
                    kafkaTemplate.send("payment.initiated", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else if ("payment.failed".equals(event.getEventType())) {
                    PaymentFailedEvent payload = objectMapper.readValue(event.getPayload(), PaymentFailedEvent.class);
                    kafkaTemplate.send("payment.failed", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else if ("payment.completed".equals(event.getEventType())) {
                    PaymentCompletedEvent payload = objectMapper.readValue(event.getPayload(), PaymentCompletedEvent.class);
                    kafkaTemplate.send("payment.completed", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else if ("payment.settled".equals(event.getEventType())) {
                    PaymentSettledEvent payload = objectMapper.readValue(event.getPayload(), PaymentSettledEvent.class);
                    kafkaTemplate.send("payment.settled", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else {
                    kafkaTemplate.send(event.getEventType(), event.getAggregateId(), event.getPayload()).get(5, TimeUnit.SECONDS);
                }

                event.setSentAt(Instant.now());
                outboxEventRepository.save(event);
                log.info("Relayed payment outbox event {} to Kafka topic {}", event.getId(), event.getEventType());
            } catch (Exception e) {
                log.error("Failed to relay payment outbox event {}: {}", event.getId(), e.getMessage());
                break;
            }
        }
    }
}
