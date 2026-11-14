package com.fincore.core_banking_services.events;

import com.fincore.core_banking_services.customer.CustomerService;
import com.fincore.core_banking_services.customer.KycStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Component
public class KycEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(KycEventConsumer.class);

    public static final String TOPIC_KYC_APPROVED = "kyc.approved";
    public static final String TOPIC_KYC_REJECTED = "kyc.rejected";

    private final ProcessedEventRepository processedEventRepository;
    private final CustomerService customerService;

    public KycEventConsumer(
            ProcessedEventRepository processedEventRepository,
            CustomerService customerService
    ) {
        this.processedEventRepository = processedEventRepository;
        this.customerService = customerService;
    }

    @KafkaListener(topics = TOPIC_KYC_APPROVED, groupId = "${spring.kafka.consumer.group-id:core-banking-kyc-group}")
    @Transactional
    public void handleKycApproved(Map<String, Object> event) {
        log.info("Received kyc.approved event: {}", event);
        processKycStatusChange(event, KycStatus.VERIFIED, "kyc-approved");
    }

    @KafkaListener(topics = TOPIC_KYC_REJECTED, groupId = "${spring.kafka.consumer.group-id:core-banking-kyc-group}")
    @Transactional
    public void handleKycRejected(Map<String, Object> event) {
        log.info("Received kyc.rejected event: {}", event);
        processKycStatusChange(event, KycStatus.REJECTED, "kyc-rejected");
    }

    private void processKycStatusChange(Map<String, Object> event, KycStatus targetStatus, String prefix) {
        Object customerIdObj = event.get("customerId");
        if (customerIdObj == null) {
            log.warn("Missing customerId in KYC event: {}", event);
            return;
        }

        UUID customerId;
        try {
            customerId = UUID.fromString(customerIdObj.toString());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid customerId format in KYC event: {}", customerIdObj);
            return;
        }

        Object kycAppIdObj = event.get("kycApplicationId");
        String eventKey = prefix + ":" + (kycAppIdObj != null ? kycAppIdObj.toString() : customerId.toString());

        if (processedEventRepository.existsByIdempotencyKey(eventKey)) {
            log.info("Skipping duplicate KYC event with key: {}", eventKey);
            return;
        }

        try {
            customerService.updateKycStatus(customerId, targetStatus);
            processedEventRepository.save(new ProcessedEvent(eventKey));
            log.info("Successfully updated customer {} KYC status to {} via event {}", customerId, targetStatus, eventKey);
        } catch (Exception e) {
            log.error("Failed to update customer {} KYC status to {}: {}", customerId, targetStatus, e.getMessage(), e);
        }
    }
}
