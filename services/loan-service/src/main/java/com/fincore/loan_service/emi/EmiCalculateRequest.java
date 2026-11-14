package com.fincore.loan_service.emi;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class EmiCalculateRequest {
    @NotNull @DecimalMin("1.00")
    private BigDecimal principal;

    @DecimalMin("0.001") @DecimalMax("1.000")
    private double annualRate;  // e.g. 0.10 = 10%

    @Min(1) @Max(360)
    private int tenureMonths;

    public BigDecimal getPrincipal() { return principal; }
    public void setPrincipal(BigDecimal principal) { this.principal = principal; }
    public double getAnnualRate() { return annualRate; }
    public void setAnnualRate(double annualRate) { this.annualRate = annualRate; }
    public int getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(int tenureMonths) { this.tenureMonths = tenureMonths; }
}
