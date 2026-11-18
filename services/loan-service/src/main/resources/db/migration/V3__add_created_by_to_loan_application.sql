-- Migration V3: Add created_by column to loan_application for maker-checker dual authorization
ALTER TABLE loan_application ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
