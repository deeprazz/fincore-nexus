package com.fincore.notification_service.notification;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "delivery_log")
public class DeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "notification_id")
    private UUID notificationId;

    @Column(nullable = false, length = 30)
    private String channel;

    @Column(nullable = false, length = 150)
    private String recipient;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 1;

    @Column(name = "response_details", columnDefinition = "text")
    private String responseDetails;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public DeliveryLog() {
    }

    public DeliveryLog(UUID notificationId, String channel, String recipient, String status, String provider, String responseDetails) {
        this.notificationId = notificationId;
        this.channel = channel;
        this.recipient = recipient;
        this.status = status;
        this.provider = provider;
        this.responseDetails = responseDetails;
        this.attemptCount = 1;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getNotificationId() { return notificationId; }
    public void setNotificationId(UUID notificationId) { this.notificationId = notificationId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public String getResponseDetails() { return responseDetails; }
    public void setResponseDetails(String responseDetails) { this.responseDetails = responseDetails; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
