-- V10: PIN lockout columns on customer, and transactional outbox table

ALTER TABLE customer ADD COLUMN IF NOT EXISTS failed_pin_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS outbox_event (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outbox_event_unsent ON outbox_event (created_at ASC) WHERE sent_at IS NULL;
