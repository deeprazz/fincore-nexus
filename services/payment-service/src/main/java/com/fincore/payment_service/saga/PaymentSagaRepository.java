package com.fincore.payment_service.saga;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PaymentSagaRepository extends JpaRepository<PaymentSaga, UUID> {
    Optional<PaymentSaga> findByCorrelationId(UUID correlationId);
    Optional<PaymentSaga> findByPaymentId(UUID paymentId);
}
