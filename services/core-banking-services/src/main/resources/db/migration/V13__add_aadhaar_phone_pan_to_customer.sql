-- Add Phone Number, Aadhaar Number, and PAN Number to customer table
ALTER TABLE customer ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
