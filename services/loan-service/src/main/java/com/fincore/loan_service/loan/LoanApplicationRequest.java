package com.fincore.loan_service.loan;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public class LoanApplicationRequest {
    @NotNull
    private UUID customerId;

    @NotNull @DecimalMin("1000.00")
    private BigDecimal requestedAmount;

    @Min(3) @Max(360)
    private int tenureMonths;

    private String purpose;

    @NotNull @DecimalMin("1.00")
    private BigDecimal annualIncome;

    @NotBlank
    private String employmentType;

    private BigDecimal existingObligations = BigDecimal.ZERO;

    // Getters/setters
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public int getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(int tenureMonths) { this.tenureMonths = tenureMonths; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public BigDecimal getAnnualIncome() { return annualIncome; }
    public void setAnnualIncome(BigDecimal annualIncome) { this.annualIncome = annualIncome; }
    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }
    public BigDecimal getExistingObligations() { return existingObligations; }
    public void setExistingObligations(BigDecimal existingObligations) { this.existingObligations = existingObligations; }
}
