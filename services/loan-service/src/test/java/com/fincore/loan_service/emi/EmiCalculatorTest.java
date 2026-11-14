package com.fincore.loan_service.emi;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class EmiCalculatorTest {

    private final EmiCalculator calculator = new EmiCalculator();

    @Test
    void standardEmi_calculationCorrect() {
        // 1,00,000 at 10% pa for 12 months -> EMI ~8791
        BigDecimal emi = calculator.calculateEmi(new BigDecimal("100000"), 0.10, 12);
        assertTrue(emi.compareTo(new BigDecimal("8000")) > 0);
        assertTrue(emi.compareTo(new BigDecimal("9500")) < 0, "EMI should be around 8791");
    }

    @Test
    void schedule_hasCorrectNumberOfInstallments() {
        List<EmiCalculator.EmiScheduleEntry> schedule = calculator.generateSchedule(
                new BigDecimal("500000"), 0.12, 24, LocalDate.now().plusMonths(1)
        );
        assertEquals(24, schedule.size());
    }

    @Test
    void lastInstallment_outstandingIsZero() {
        List<EmiCalculator.EmiScheduleEntry> schedule = calculator.generateSchedule(
                new BigDecimal("100000"), 0.10, 12, LocalDate.now().plusMonths(1)
        );
        BigDecimal lastOutstanding = schedule.get(schedule.size() - 1).outstandingAfter();
        assertTrue(lastOutstanding.compareTo(new BigDecimal("0.01")) <= 0,
                "Outstanding after last installment should be ~0, was: " + lastOutstanding);
    }

    @Test
    void zeroInterestRate_equalInstallments() {
        BigDecimal emi = calculator.calculateEmi(new BigDecimal("120000"), 0.0, 12);
        assertEquals(new BigDecimal("10000.00"), emi);
    }

    @Test
    void schedule_installmentNumbersAreSequential() {
        List<EmiCalculator.EmiScheduleEntry> schedule = calculator.generateSchedule(
                new BigDecimal("200000"), 0.08, 6, LocalDate.now().plusMonths(1)
        );
        for (int i = 0; i < schedule.size(); i++) {
            assertEquals(i + 1, schedule.get(i).installmentNumber());
        }
    }
}
