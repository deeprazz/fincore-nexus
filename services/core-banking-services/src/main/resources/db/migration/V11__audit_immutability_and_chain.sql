-- Milestone 1 Phase 1: Audit Immutability and SHA-256 Hash Chain
-- Add prev_hash and hash columns to audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS hash VARCHAR(64);

-- Backfill any existing audit log rows with a continuous SHA-256 chain
DO $$
DECLARE
    r RECORD;
    last_h VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    curr_h VARCHAR(64);
    raw_str TEXT;
BEGIN
    FOR r IN 
        SELECT id, action, entity_type, entity_id, actor, details, 
               FLOOR(EXTRACT(EPOCH FROM created_at) * 1000)::bigint::text AS ms 
        FROM audit_log 
        ORDER BY created_at ASC, id ASC 
    LOOP
        raw_str := last_h || ':' || 
                   coalesce(r.id::text, '') || ':' || 
                   coalesce(r.action, '') || ':' || 
                   coalesce(r.entity_type, '') || ':' || 
                   coalesce(r.entity_id::text, '') || ':' || 
                   coalesce(r.actor, '') || ':' || 
                   coalesce(r.details, '') || ':' || 
                   r.ms;
        curr_h := encode(sha256(raw_str::bytea), 'hex');
        UPDATE audit_log SET prev_hash = last_h, hash = curr_h WHERE id = r.id;
        last_h := curr_h;
    END LOOP;
END $$;

-- Enforce immutability: reject all UPDATE and DELETE operations
CREATE OR REPLACE FUNCTION reject_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION reject_audit_log_modification();
