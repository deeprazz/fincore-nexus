CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    actor VARCHAR(100) NOT NULL,
    details VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    prev_hash VARCHAR(64),
    hash VARCHAR(64)
);

CREATE INDEX idx_payment_audit_log_created ON audit_log(created_at DESC);

-- Reject updates or deletes on audit_log (append-only immutability)
CREATE OR REPLACE FUNCTION reject_payment_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'payment audit_log is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_payment_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION reject_payment_audit_log_modification();
