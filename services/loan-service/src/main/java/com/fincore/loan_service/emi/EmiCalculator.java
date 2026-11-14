package com.fincore.loan_service.emi;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
public class EmiCalculator {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final int SCALE = 2;

    /**
     * Calculate monthly EMI using: EMI = P·r·(1+r)^n / ((1+r)^n − 1)
     * @param principal    loan principal
     * @param annualRate   annual interest rate (e.g. 0.10 for 10%)
     * @param tenureMonths number of monthly installments
     */
    public BigDecimal calculateEmi(BigDecimal principal, double annualRate, int tenureMonths) {
        if (annualRate == 0.0) {
            return principal.divide(BigDecimal.valueOf(tenureMonths), SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal monthlyRate = BigDecimal.valueOf(annualRate / 12.0).round(MC);
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate, MC);
        BigDecimal onePlusRPowN = onePlusR.pow(tenureMonths, MC);
        BigDecimal numerator = principal.multiply(monthlyRate, MC).multiply(onePlusRPowN, MC);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE, MC);
        return numerator.divide(denominator, SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Generate full amortisation schedule.
     * Last installment is adjusted to eliminate rounding residual.
     */
    public List<EmiScheduleEntry> generateSchedule(
            BigDecimal principal,
            double annualRate,
            int tenureMonths,
            LocalDate firstDueDate) {

        BigDecimal emi = calculateEmi(principal, annualRate, tenureMonths);
        BigDecimal monthlyRate = BigDecimal.valueOf(annualRate / 12.0).round(MC);
        BigDecimal outstanding = principal;
        List<EmiScheduleEntry> schedule = new ArrayList<>();
        LocalDate dueDate = firstDueDate;
        BigDecimal totalPaid = BigDecimal.ZERO;

        for (int i = 1; i <= tenureMonths; i++) {
            BigDecimal interestComponent = outstanding.multiply(monthlyRate, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal principalComponent = emi.subtract(interestComponent);

            // Last installment fix: adjust by residual
            if (i == tenureMonths) {
                principalComponent = outstanding;
                emi = principalComponent.add(interestComponent);
            }

            outstanding = outstanding.subtract(principalComponent).setScale(SCALE, RoundingMode.HALF_UP);
            if (outstanding.compareTo(BigDecimal.ZERO) < 0) outstanding = BigDecimal.ZERO;

            schedule.add(new EmiScheduleEntry(i, dueDate, emi, principalComponent, interestComponent, outstanding));
            totalPaid = totalPaid.add(emi);
            dueDate = dueDate.plusMonths(1);
        }

        return schedule;
    }

    public record EmiScheduleEntry(
            int installmentNumber,
            LocalDate dueDate,
            BigDecimal emiAmount,
            BigDecimal principalComponent,
            BigDecimal interestComponent,
            BigDecimal outstandingAfter
    ) {}
}
