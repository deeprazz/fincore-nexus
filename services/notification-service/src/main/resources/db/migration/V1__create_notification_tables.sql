CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DELIVERED',
    delivery_provider VARCHAR(50) NOT NULL DEFAULT 'simulated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE processed_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_customer ON notification(customer_id);
CREATE INDEX idx_notification_status ON notification(status);
CREATE INDEX idx_notification_created ON notification(created_at DESC);
