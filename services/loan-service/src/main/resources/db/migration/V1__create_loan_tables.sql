CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE loan_application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    requested_amount NUMERIC(19,2) NOT NULL,
    tenure_months INT NOT NULL,
    purpose VARCHAR(255),
    annual_income NUMERIC(19,2) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    existing_obligations NUMERIC(19,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    credit_score INT,
    rejection_reason TEXT,
    reviewer_id VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES loan_application(id),
    customer_id UUID NOT NULL,
    principal_amount NUMERIC(19,2) NOT NULL,
    outstanding_amount NUMERIC(19,2) NOT NULL,
    interest_rate NUMERIC(5,4) NOT NULL,
    tenure_months INT NOT NULL,
    emi_amount NUMERIC(19,2) NOT NULL,
    disbursed_at TIMESTAMPTZ,
    start_date DATE,
    end_date DATE,
    account_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_DISBURSEMENT',
    npa_category VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    days_past_due INT NOT NULL DEFAULT 0,
    prepayment_penalty_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0200,
    foreclosure_penalty_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE emi_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loan(id),
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    emi_amount NUMERIC(19,2) NOT NULL,
    principal_component NUMERIC(19,2) NOT NULL,
    interest_component NUMERIC(19,2) NOT NULL,
    outstanding_after NUMERIC(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMPTZ,
    penalty_amount NUMERIC(19,2) NOT NULL DEFAULT 0.00,
    days_overdue INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(loan_id, installment_number)
);

CREATE TABLE loan_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID,
    application_id UUID,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE processed_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saga_instance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'STARTED',
    current_step VARCHAR(50) NOT NULL,
    correlation_id UUID NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_note (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loan(id),
    officer_id VARCHAR(100) NOT NULL,
    note TEXT NOT NULL,
    action_taken VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_customer_id ON loan(customer_id);
CREATE INDEX idx_loan_status ON loan(status);
CREATE INDEX idx_emi_loan_status ON emi_schedule(loan_id, status);
CREATE INDEX idx_emi_due_date ON emi_schedule(due_date, status);
CREATE INDEX idx_loan_application_customer ON loan_application(customer_id);
CREATE INDEX idx_collection_note_loan ON collection_note(loan_id);
