
CREATE TABLE banking_transaction (
                                     id UUID PRIMARY KEY,
                                     account_id UUID NOT NULL,
                                     transaction_type VARCHAR(20) NOT NULL
                                         CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
                                     amount NUMERIC(19,2) NOT NULL
                                         CHECK (amount > 0),
                                     balance_after NUMERIC(19,2) NOT NULL
                                         CHECK (balance_after >= 0),
                                     reference_id UUID,
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                                     CONSTRAINT fk_transaction_account
                                         FOREIGN KEY (account_id)
                                             REFERENCES account(id)
);

CREATE INDEX idx_banking_transaction_account_created
    ON banking_transaction (account_id, created_at DESC);

CREATE INDEX idx_banking_transaction_reference
    ON banking_transaction (reference_id);
