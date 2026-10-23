package com.fincore.core_banking_services.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TransactionKafkaPublisher {

    private static final Logger log = LoggerFactory.getLogger(TransactionKafkaPublisher.class);
    private static final String TOPIC = "transaction.completed";

    private final KafkaTemplate<String, TransactionCompletedEvent> kafkaTemplate;

    public TransactionKafkaPublisher(KafkaTemplate<String, TransactionCompletedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransactionCompleted(TransactionCompletedEvent event) {
        String key = event.accountId().toString();
        kafkaTemplate.send(TOPIC, key, event).whenComplete((result, error) -> {
            if (error != null) {
                log.error("Failed to publish transaction.completed event for transaction {}",
                        event.transactionId(), error);
            } else {
                log.info("Published transaction.completed event: transactionId={}, partition={}, offset={}",
                        event.transactionId(), result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
