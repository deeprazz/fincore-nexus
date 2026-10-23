-- One-time account creation registry.
-- Existing account records and balances remain unchanged.

CREATE TABLE customer_account_entitlement (
                                              customer_id UUID PRIMARY KEY,
                                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                              CONSTRAINT fk_entitlement_customer
                                                  FOREIGN KEY (customer_id)
                                                      REFERENCES customer(id)
);

-- Reserve one entitlement for every customer who already
-- has at least one account. Do not delete or merge accounts.
INSERT INTO customer_account_entitlement (customer_id)
SELECT DISTINCT customer_id
FROM account
    ON CONFLICT (customer_id) DO NOTHING;