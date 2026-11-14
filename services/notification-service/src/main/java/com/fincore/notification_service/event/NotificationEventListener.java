package com.fincore.notification_service.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.notification_service.notification.NotificationChannel;
import com.fincore.notification_service.notification.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;
    private final ProcessedEventRepository processedEventRepository;
    private final ObjectMapper objectMapper;

    public NotificationEventListener(NotificationService notificationService,
                                     ProcessedEventRepository processedEventRepository,
                                     ObjectMapper objectMapper) {
        this.notificationService = notificationService;
        this.processedEventRepository = processedEventRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "payment.completed", groupId = "notification-service")
    public void onPaymentCompleted(String payload) {
        handleEvent("payment.completed", payload, (node, customerId) -> {
            String utr = node.path("utr").asText("UTR");
            String amount = node.path("amount").asText("0.00");
            String content = "FinCore Alert: Your payment of INR " + amount + " (UTR: " + utr + ") has been completed successfully.";
            notificationService.sendNotification(customerId, NotificationChannel.SMS, "+91-9876543210", "Payment Successful", content, "PAYMENT_COMPLETED");
            notificationService.sendNotification(customerId, NotificationChannel.EMAIL, "customer@fincore.bank", "Payment Receipt: " + utr, content, "PAYMENT_COMPLETED");
        });
    }

    @KafkaListener(topics = "payment.failed", groupId = "notification-service")
    public void onPaymentFailed(String payload) {
        handleEvent("payment.failed", payload, (node, customerId) -> {
            String utr = node.path("utr").asText("UTR");
            String reason = node.path("reason").asText("Processing failure");
            String content = "FinCore Alert: Payment " + utr + " failed. Reason: " + reason;
            notificationService.sendNotification(customerId, NotificationChannel.SMS, "+91-9876543210", "Payment Failed", content, "PAYMENT_FAILED");
        });
    }

    @KafkaListener(topics = "loan.disbursed", groupId = "notification-service")
    public void onLoanDisbursed(String payload) {
        handleEvent("loan.disbursed", payload, (node, customerId) -> {
            String amount = node.path("disbursedAmount").asText("0.00");
            String content = "FinCore Alert: Loan amount INR " + amount + " has been disbursed to your account.";
            notificationService.sendNotification(customerId, NotificationChannel.SMS, "+91-9876543210", "Loan Disbursed", content, "LOAN_DISBURSED");
        });
    }

    private void handleEvent(String topic, String payload, NotificationHandler handler) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String idKey = topic + ":" + node.path("correlationId").asText(node.path("utr").asText(UUID.randomUUID().toString()));
            if (processedEventRepository.existsByIdempotencyKey(idKey)) {
                log.info("Already processed notification for key {}", idKey);
                return;
            }

            UUID customerId = null;
            if (node.hasNonNull("customerId")) {
                try {
                    customerId = UUID.fromString(node.get("customerId").asText());
                } catch (Exception ignored) {}
            }

            handler.handle(node, customerId);

            ProcessedEvent pe = new ProcessedEvent();
            pe.setIdempotencyKey(idKey);
            processedEventRepository.save(pe);
        } catch (Exception e) {
            log.error("Failed to process event on topic {}: {}", topic, e.getMessage(), e);
        }
    }

    @FunctionalInterface
    interface NotificationHandler {
        void handle(JsonNode node, UUID customerId) throws Exception;
    }
}
