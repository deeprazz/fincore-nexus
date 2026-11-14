CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE beneficiary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    vpa VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    source_account_id UUID NOT NULL,
    beneficiary_id UUID REFERENCES beneficiary(id),
    target_account_number VARCHAR(50),
    target_ifsc VARCHAR(20),
    target_vpa VARCHAR(100),
    amount NUMERIC(19,2) NOT NULL,
    payment_rail VARCHAR(20) NOT NULL,
    utr VARCHAR(60) NOT NULL UNIQUE,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    fraud_score NUMERIC(5,4),
    fraud_decision VARCHAR(20),
    triggered_rules TEXT,
    purpose VARCHAR(255),
    failure_reason TEXT,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_saga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    correlation_id UUID NOT NULL UNIQUE,
    current_step VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'STARTED',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settlement_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_reference VARCHAR(100) NOT NULL UNIQUE,
    payment_rail VARCHAR(20) NOT NULL,
    total_transactions INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE processed_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_beneficiary_customer ON beneficiary(customer_id);
CREATE INDEX idx_payment_customer ON payment(customer_id);
CREATE INDEX idx_payment_source_account ON payment(source_account_id);
CREATE INDEX idx_payment_status ON payment(status);
CREATE INDEX idx_payment_utr ON payment(utr);
CREATE INDEX idx_payment_rail_status ON payment(payment_rail, status);
CREATE INDEX idx_payment_saga_correlation ON payment_saga(correlation_id);
