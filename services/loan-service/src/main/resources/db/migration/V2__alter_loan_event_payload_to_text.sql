-- Migration V2: Change loan_event.payload from JSONB to TEXT
-- Ensures JDBC varchar parameter binding succeeds seamlessly across all PostgreSQL drivers
ALTER TABLE loan_event ALTER COLUMN payload TYPE TEXT USING payload::text;
