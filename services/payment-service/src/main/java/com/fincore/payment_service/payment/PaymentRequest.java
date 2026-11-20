package com.fincore.payment_service.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class PaymentRequest {
    @NotNull
    private UUID customerId;

    @NotNull
    private UUID sourceAccountId;

    private UUID beneficiaryId;

    private String targetAccountNumber;
    private String targetIfsc;
    private String targetVpa;

    @NotNull
    @DecimalMin("1.00")
    private BigDecimal amount;

    @NotNull
    private PaymentRail paymentRail;

    private String idempotencyKey;

    private String purpose;

    private String createdBy;

    private String transactionPassword;

    private String transactionPin;

    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public UUID getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(UUID sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public UUID getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(UUID beneficiaryId) { this.beneficiaryId = beneficiaryId; }
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
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getTransactionPassword() { return transactionPassword; }
    public void setTransactionPassword(String transactionPassword) { this.transactionPassword = transactionPassword; }
    public String getTransactionPin() { return transactionPin; }
    public void setTransactionPin(String transactionPin) { this.transactionPin = transactionPin; }
}
