
ALTER TABLE banking_transaction
DROP CONSTRAINT banking_transaction_transaction_type_check;

ALTER TABLE banking_transaction
    ADD CONSTRAINT banking_transaction_type_check
        CHECK (
            transaction_type IN (
                                 'DEPOSIT',
                                 'WITHDRAWAL',
                                 'TRANSFER',
                                 'TRANSFER_OUT',
                                 'TRANSFER_IN'
                )
            );
