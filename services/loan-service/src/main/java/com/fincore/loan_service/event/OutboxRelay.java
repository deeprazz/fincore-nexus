package com.fincore.loan_service.event;

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
                if ("loan.approved".equals(event.getEventType())) {
                    LoanApprovedEvent payload = objectMapper.readValue(event.getPayload(), LoanApprovedEvent.class);
                    kafkaTemplate.send("loan.approved", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else if ("emi.debit.requested".equals(event.getEventType())) {
                    EmiDebitRequestedEvent payload = objectMapper.readValue(event.getPayload(), EmiDebitRequestedEvent.class);
                    kafkaTemplate.send("emi.debit.requested", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else {
                    kafkaTemplate.send(event.getEventType(), event.getAggregateId(), event.getPayload()).get(5, TimeUnit.SECONDS);
                }

                event.setSentAt(Instant.now());
                outboxEventRepository.save(event);
                log.info("Relayed outbox event {} to Kafka topic {}", event.getId(), event.getEventType());
            } catch (Exception e) {
                log.error("Failed to relay outbox event {}: {}", event.getId(), e.getMessage());
                break; // Stop and retry on next tick
            }
        }
    }
}
