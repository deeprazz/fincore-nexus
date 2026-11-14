-- KYC and Compliance Schema

CREATE TABLE IF NOT EXISTS kyc_application (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    pan_number_masked VARCHAR(20) NOT NULL,
    pan_hash VARCHAR(64) NOT NULL,
    aadhaar_last4 VARCHAR(4) NOT NULL,
    aadhaar_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL,
    ocr_status VARCHAR(20) NOT NULL,
    ocr_confidence NUMERIC(5,2),
    extracted_pan VARCHAR(20),
    extracted_name VARCHAR(150),
    face_match_status VARCHAR(20) NOT NULL,
    face_match_confidence NUMERIC(5,2),
    liveness_verified BOOLEAN NOT NULL DEFAULT FALSE,
    risk_level VARCHAR(20) NOT NULL,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    pep_match BOOLEAN NOT NULL DEFAULT FALSE,
    sanctions_match BOOLEAN NOT NULL DEFAULT FALSE,
    risk_reasons TEXT,
    submitted_by VARCHAR(50) NOT NULL,
    reviewed_by VARCHAR(50),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kyc_customer_id ON kyc_application(customer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_application(status);
CREATE INDEX IF NOT EXISTS idx_kyc_pan_hash ON kyc_application(pan_hash);

CREATE TABLE IF NOT EXISTS kyc_document (
    id UUID PRIMARY KEY,
    kyc_application_id UUID NOT NULL REFERENCES kyc_application(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    encrypted_file_path VARCHAR(500) NOT NULL,
    encryption_iv VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kyc_doc_app_id ON kyc_document(kyc_application_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    performed_by VARCHAR(50) NOT NULL,
    details TEXT,
    prev_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_created ON audit_log(created_at);

-- Immutability Trigger on audit_log
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TABLE IF NOT EXISTS processed_event (
    event_key VARCHAR(150) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL
);
