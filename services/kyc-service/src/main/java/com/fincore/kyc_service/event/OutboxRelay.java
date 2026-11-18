package com.fincore.kyc_service.event;

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
                if ("kyc.approved".equals(event.getEventType())) {
                    KycApprovedEvent payload = objectMapper.readValue(event.getPayload(), KycApprovedEvent.class);
                    kafkaTemplate.send("kyc.approved", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else if ("kyc.rejected".equals(event.getEventType())) {
                    KycRejectedEvent payload = objectMapper.readValue(event.getPayload(), KycRejectedEvent.class);
                    kafkaTemplate.send("kyc.rejected", event.getAggregateId(), payload).get(5, TimeUnit.SECONDS);
                } else {
                    kafkaTemplate.send(event.getEventType(), event.getAggregateId(), event.getPayload()).get(5, TimeUnit.SECONDS);
                }

                event.setSentAt(Instant.now());
                outboxEventRepository.save(event);
                log.info("Relayed kyc outbox event {} to Kafka topic {}", event.getId(), event.getEventType());
            } catch (Exception e) {
                log.error("Failed to relay kyc outbox event {}: {}", event.getId(), e.getMessage());
                break;
            }
        }
    }
}
