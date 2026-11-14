package com.fincore.loan_service.loan;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "loan")
public class Loan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "outstanding_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal outstandingAmount;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "tenure_months", nullable = false)
    private int tenureMonths;

    @Column(name = "emi_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "disbursed_at")
    private OffsetDateTime disbursedAt;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "account_id")
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status = LoanStatus.PENDING_DISBURSEMENT;

    @Enumerated(EnumType.STRING)
    @Column(name = "npa_category", nullable = false)
    private NpaCategory npaCategory = NpaCategory.STANDARD;

    @Column(name = "days_past_due", nullable = false)
    private int daysPastDue = 0;

    @Column(name = "prepayment_penalty_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal prepaymentPenaltyRate = new BigDecimal("0.0200");

    @Column(name = "foreclosure_penalty_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal foreclosurePenaltyRate = new BigDecimal("0.0300");

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    // Getters and setters
    public UUID getId() { return id; }
    public UUID getApplicationId() { return applicationId; }
    public void setApplicationId(UUID applicationId) { this.applicationId = applicationId; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public BigDecimal getOutstandingAmount() { return outstandingAmount; }
    public void setOutstandingAmount(BigDecimal outstandingAmount) { this.outstandingAmount = outstandingAmount; }
    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
    public int getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(int tenureMonths) { this.tenureMonths = tenureMonths; }
    public BigDecimal getEmiAmount() { return emiAmount; }
    public void setEmiAmount(BigDecimal emiAmount) { this.emiAmount = emiAmount; }
    public OffsetDateTime getDisbursedAt() { return disbursedAt; }
    public void setDisbursedAt(OffsetDateTime disbursedAt) { this.disbursedAt = disbursedAt; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public UUID getAccountId() { return accountId; }
    public void setAccountId(UUID accountId) { this.accountId = accountId; }
    public LoanStatus getStatus() { return status; }
    public void setStatus(LoanStatus status) { this.status = status; }
    public NpaCategory getNpaCategory() { return npaCategory; }
    public void setNpaCategory(NpaCategory npaCategory) { this.npaCategory = npaCategory; }
    public int getDaysPastDue() { return daysPastDue; }
    public void setDaysPastDue(int daysPastDue) { this.daysPastDue = daysPastDue; }
    public BigDecimal getPrepaymentPenaltyRate() { return prepaymentPenaltyRate; }
    public void setPrepaymentPenaltyRate(BigDecimal prepaymentPenaltyRate) { this.prepaymentPenaltyRate = prepaymentPenaltyRate; }
    public BigDecimal getForeclosurePenaltyRate() { return foreclosurePenaltyRate; }
    public void setForeclosurePenaltyRate(BigDecimal foreclosurePenaltyRate) { this.foreclosurePenaltyRate = foreclosurePenaltyRate; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
