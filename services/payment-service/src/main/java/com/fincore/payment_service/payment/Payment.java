package com.fincore.payment_service.payment;

import com.fincore.payment_service.beneficiary.Beneficiary;
import com.fincore.payment_service.fraud.FraudDecision;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "source_account_id", nullable = false)
    private UUID sourceAccountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "beneficiary_id")
    private Beneficiary beneficiary;

    @Column(name = "target_account_number")
    private String targetAccountNumber;

    @Column(name = "target_ifsc")
    private String targetIfsc;

    @Column(name = "target_vpa")
    private String targetVpa;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_rail", nullable = false)
    private PaymentRail paymentRail;

    @Column(nullable = false, unique = true)
    private String utr;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.INITIATED;

    @Column(name = "fraud_score", precision = 5, scale = 4)
    private BigDecimal fraudScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "fraud_decision")
    private FraudDecision fraudDecision;

    @Column(name = "triggered_rules", columnDefinition = "text")
    private String triggeredRules;

    private String purpose;

    @Column(name = "failure_reason", columnDefinition = "text")
    private String failureReason;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public UUID getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(UUID sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public Beneficiary getBeneficiary() { return beneficiary; }
    public void setBeneficiary(Beneficiary beneficiary) { this.beneficiary = beneficiary; }
    public String getTargetAccountNumber() { return targetAccountNumber; }
    public void setTargetAccountNumber(String targetAccountNumber) { this.targetAccountNumber = targetAccountNumber; }
    public String getTargetIfsc() { return targetIfsc; }
    public void setTargetIfsc(String targetIfsc) { this.targetIfsc = targetIfsc; }
    public String getTargetVpa() { return targetVpa; }
    public void setTargetVpa(String targetVpa) { this.targetVpa = targetVpa; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public PaymentRail getPaymentRail() { return paymentRail; }
    public void setPaymentRail(PaymentRail paymentRail) { this.paymentRail = paymentRail; }
    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public BigDecimal getFraudScore() { return fraudScore; }
    public void setFraudScore(BigDecimal fraudScore) { this.fraudScore = fraudScore; }
    public FraudDecision getFraudDecision() { return fraudDecision; }
    public void setFraudDecision(FraudDecision fraudDecision) { this.fraudDecision = fraudDecision; }
    public String getTriggeredRules() { return triggeredRules; }
    public void setTriggeredRules(String triggeredRules) { this.triggeredRules = triggeredRules; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public OffsetDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(OffsetDateTime settledAt) { this.settledAt = settledAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
