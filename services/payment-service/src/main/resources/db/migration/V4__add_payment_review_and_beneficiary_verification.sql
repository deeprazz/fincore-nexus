-- Migration V4: Add maker-checker audit columns to payment and verification details to beneficiary

ALTER TABLE payment
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE beneficiary
    ADD COLUMN IF NOT EXISTS verification_details TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_created_by ON payment(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_reviewed_by ON payment(reviewed_by);
