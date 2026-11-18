CREATE TABLE delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID,
    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    response_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_log_created ON delivery_log(created_at DESC);

-- Reject updates or deletes on delivery_log (append-only immutability)
CREATE OR REPLACE FUNCTION reject_delivery_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'delivery_log is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delivery_log_immutable ON delivery_log;
CREATE TRIGGER trg_delivery_log_immutable
BEFORE UPDATE OR DELETE ON delivery_log
FOR EACH ROW
EXECUTE FUNCTION reject_delivery_log_modification();
