-- Migration V14: Create pending_approval table for high-value dual authorization / maker-checker
CREATE TABLE IF NOT EXISTS pending_approval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,
    from_account_id UUID NOT NULL,
    to_account_id UUID,
    amount NUMERIC(19, 4) NOT NULL,
    description TEXT,
    maker VARCHAR(100) NOT NULL,
    checker VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_approval_status ON pending_approval(status);
