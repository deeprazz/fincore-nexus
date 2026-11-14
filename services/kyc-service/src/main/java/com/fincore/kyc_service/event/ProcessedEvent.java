package com.fincore.kyc_service.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "processed_event")
public class ProcessedEvent {

    @Id
    @Column(name = "event_key", length = 150)
    private String eventKey;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public ProcessedEvent() {}

    public ProcessedEvent(String eventKey, String eventType, Instant processedAt) {
        this.eventKey = eventKey;
        this.eventType = eventType;
        this.processedAt = processedAt;
    }

    public String getEventKey() { return eventKey; }
    public String getEventType() { return eventType; }
    public Instant getProcessedAt() { return processedAt; }
}
