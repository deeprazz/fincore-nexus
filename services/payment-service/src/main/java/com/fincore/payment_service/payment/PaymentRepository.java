package com.fincore.payment_service.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    Optional<Payment> findByUtr(String utr);
    List<Payment> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<Payment> findByPaymentRailAndStatus(PaymentRail rail, PaymentStatus status);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.customerId = :customerId AND p.createdAt >= :since")
    long countRecentPaymentsByCustomer(@Param("customerId") UUID customerId, @Param("since") OffsetDateTime since);

    @Query("SELECT AVG(p.amount) FROM Payment p WHERE p.customerId = :customerId AND p.status = 'SETTLED'")
    BigDecimal averagePaymentAmountByCustomer(@Param("customerId") UUID customerId);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.customerId = :customerId AND p.status = 'FAILED' AND p.createdAt >= :since")
    long countRecentFailedPayments(@Param("customerId") UUID customerId, @Param("since") OffsetDateTime since);

    long countByStatus(PaymentStatus status);
}
