CREATE TABLE account (
            id             UUID PRIMARY KEY,
            customer_id    UUID NOT NULL,
            account_number VARCHAR(30) NOT NULL UNIQUE,
            balance        NUMERIC(19,2) NOT NULL CHECK ( balance >=0 ),
            status VARCHAR(20) NOT NULL
                CHECK (status IN ('ACTIVE', 'CLOSED', 'FROZEN')),
            created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

            FOREIGN KEY (customer_id)
            REFERENCES customer(id)
    );