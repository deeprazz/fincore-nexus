-- Append-only application audit trail for Milestone 1.
-- No existing customer, account, or transaction records are modified.
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    actor VARCHAR(40) NOT NULL,
    details VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
