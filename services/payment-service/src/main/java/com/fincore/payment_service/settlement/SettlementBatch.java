package com.fincore.payment_service.settlement;

import com.fincore.payment_service.payment.PaymentRail;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "settlement_batch")
public class SettlementBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "batch_reference", nullable = false, unique = true)
    private String batchReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_rail", nullable = false)
    private PaymentRail paymentRail;

    @Column(name = "total_transactions", nullable = false)
    private int totalTransactions = 0;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status = SettlementStatus.PENDING;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }
    public String getBatchReference() { return batchReference; }
    public void setBatchReference(String batchReference) { this.batchReference = batchReference; }
    public PaymentRail getPaymentRail() { return paymentRail; }
    public void setPaymentRail(PaymentRail paymentRail) { this.paymentRail = paymentRail; }
    public int getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(int totalTransactions) { this.totalTransactions = totalTransactions; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public SettlementStatus getStatus() { return status; }
    public void setStatus(SettlementStatus status) { this.status = status; }
    public OffsetDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(OffsetDateTime settledAt) { this.settledAt = settledAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
