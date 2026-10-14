CREATE TABLE customer (
                          id         UUID PRIMARY KEY,
                          name       VARCHAR(100) NOT NULL,
                          email      VARCHAR(150) NOT NULL UNIQUE,
                          kyc_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                          created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);