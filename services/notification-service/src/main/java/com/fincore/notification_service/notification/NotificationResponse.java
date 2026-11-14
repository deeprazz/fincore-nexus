package com.fincore.notification_service.notification;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID customerId,
        NotificationChannel channel,
        String recipient,
        String subject,
        String content,
        String eventType,
        String status,
        String deliveryProvider,
        OffsetDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getCustomerId(),
                n.getChannel(),
                n.getRecipient(),
                n.getSubject(),
                n.getContent(),
                n.getEventType(),
                n.getStatus(),
                n.getDeliveryProvider(),
                n.getCreatedAt()
        );
    }
}
