package com.fincore.loan_service.loan;

import com.fincore.loan_service.audit.LoanAuditService;
import com.fincore.loan_service.client.CoreBankingClient;
import com.fincore.loan_service.emi.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanRepository loanRepository;
    private final LoanApplicationRepository applicationRepository;
    private final EmiScheduleRepository emiScheduleRepository;
    private final EmiCalculator emiCalculator;
    private final CoreBankingClient coreBankingClient;
    private final LoanAuditService loanAuditService;

    public LoanController(LoanRepository loanRepository,
                          LoanApplicationRepository applicationRepository,
                          EmiScheduleRepository emiScheduleRepository,
                          EmiCalculator emiCalculator,
                          CoreBankingClient coreBankingClient,
                          LoanAuditService loanAuditService) {
        this.loanRepository = loanRepository;
        this.applicationRepository = applicationRepository;
        this.emiScheduleRepository = emiScheduleRepository;
        this.emiCalculator = emiCalculator;
        this.coreBankingClient = coreBankingClient;
        this.loanAuditService = loanAuditService;
    }

    @GetMapping
    public List<LoanResponse> getAllLoans() {
        return loanRepository.findAll().stream()
                .map(this::ensureLoanDates)
                .map(LoanResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/customer/{customerId}")
    public List<LoanResponse> getLoansByCustomer(@PathVariable UUID customerId) {
        return loanRepository.findByCustomerId(customerId).stream()
                .map(this::ensureLoanDates)
                .map(LoanResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{loanId}")
    public ResponseEntity<LoanResponse> getLoan(@PathVariable UUID loanId) {
        return loanRepository.findById(loanId)
                .map(this::ensureLoanDates)
                .map(l -> ResponseEntity.ok(LoanResponse.from(l)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/emi/calculate")
    public ResponseEntity<Map<String, Object>> calculateEmi(@Valid @RequestBody EmiCalculateRequest req) {
        BigDecimal emi = emiCalculator.calculateEmi(req.getPrincipal(), req.getAnnualRate(), req.getTenureMonths());
        BigDecimal totalPayable = emi.multiply(BigDecimal.valueOf(req.getTenureMonths()));
        BigDecimal totalInterest = totalPayable.subtract(req.getPrincipal());
        return ResponseEntity.ok(Map.of(
                "emiAmount", emi,
                "totalPayable", totalPayable,
                "totalInterest", totalInterest,
                "tenureMonths", req.getTenureMonths(),
                "annualRate", req.getAnnualRate()
        ));
    }

    @GetMapping("/{loanId}/schedule")
    public ResponseEntity<List<EmiScheduleResponse>> getSchedule(@PathVariable UUID loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new NoSuchElementException("Loan not found: " + loanId));
        loan = ensureLoanDates(loan);
        List<EmiSchedule> schedule = emiScheduleRepository.findByLoanIdOrderByInstallmentNumberAsc(loanId);
        if (schedule.isEmpty()) {
            LocalDate startDate = loan.getStartDate() != null ? loan.getStartDate() : LocalDate.now().plusMonths(1);
            List<EmiCalculator.EmiScheduleEntry> entries = emiCalculator.generateSchedule(
                    loan.getPrincipalAmount(), loan.getInterestRate().doubleValue(),
                    loan.getTenureMonths(), startDate);
            List<EmiSchedule> savedList = new ArrayList<>();
            for (EmiCalculator.EmiScheduleEntry e : entries) {
                EmiSchedule emi = new EmiSchedule();
                emi.setLoanId(loanId);
                emi.setInstallmentNumber(e.installmentNumber());
                emi.setDueDate(e.dueDate());
                emi.setEmiAmount(e.emiAmount());
                emi.setPrincipalComponent(e.principalComponent());
                emi.setInterestComponent(e.interestComponent());
                emi.setOutstandingAfter(e.outstandingAfter());
                emi.setStatus(EmiStatus.PENDING);
                savedList.add(emiScheduleRepository.save(emi));
            }
            return ResponseEntity.ok(savedList.stream().map(EmiScheduleResponse::from).collect(Collectors.toList()));
        }
        return ResponseEntity.ok(schedule.stream().map(EmiScheduleResponse::from).collect(Collectors.toList()));
    }

    @PostMapping("/{loanId}/disburse")
    public ResponseEntity<LoanResponse> disburseLoan(@PathVariable UUID loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new NoSuchElementException("Loan not found: " + loanId));
        loan = ensureLoanDates(loan);
        loan.setStatus(LoanStatus.ACTIVE);
        OffsetDateTime now = OffsetDateTime.now();
        loan.setDisbursedAt(now);
        Loan saved = loanRepository.save(loan);

        // Ensure schedule is generated in database
        List<EmiSchedule> existing = emiScheduleRepository.findByLoanIdOrderByInstallmentNumberAsc(loanId);
        if (existing.isEmpty()) {
            List<EmiCalculator.EmiScheduleEntry> entries = emiCalculator.generateSchedule(
                    saved.getPrincipalAmount(), saved.getInterestRate().doubleValue(),
                    saved.getTenureMonths(), saved.getStartDate());
            for (EmiCalculator.EmiScheduleEntry e : entries) {
                EmiSchedule emi = new EmiSchedule();
                emi.setLoanId(loanId);
                emi.setInstallmentNumber(e.installmentNumber());
                emi.setDueDate(e.dueDate());
                emi.setEmiAmount(e.emiAmount());
                emi.setPrincipalComponent(e.principalComponent());
                emi.setInterestComponent(e.interestComponent());
                emi.setOutstandingAfter(e.outstandingAfter());
                emi.setStatus(EmiStatus.PENDING);
                emiScheduleRepository.save(emi);
            }
        }

        // Update application status to DISBURSED
        if (loan.getApplicationId() != null) {
            applicationRepository.findById(loan.getApplicationId()).ifPresent(app -> {
                app.setStatus(ApplicationStatus.DISBURSED);
                applicationRepository.save(app);
            });
        }
        return ResponseEntity.ok(LoanResponse.from(saved));
    }

    private Loan ensureLoanDates(Loan loan) {
        boolean changed = false;
        if (loan.getStartDate() == null) {
            LocalDate start = loan.getDisbursedAt() != null
                    ? loan.getDisbursedAt().toLocalDate().plusMonths(1)
                    : (loan.getCreatedAt() != null ? loan.getCreatedAt().toLocalDate().plusMonths(1) : LocalDate.now().plusMonths(1));
            loan.setStartDate(start);
            loan.setEndDate(start.plusMonths(loan.getTenureMonths() - 1));
            changed = true;
        }
        if (loan.getAccountId() == null && loan.getCustomerId() != null) {
            UUID accId = coreBankingClient.getCustomerFirstActiveAccountId(loan.getCustomerId());
            if (accId != null) {
                loan.setAccountId(accId);
                changed = true;
            }
        }
        if (changed) {
            return loanRepository.save(loan);
        }
        return loan;
    }

    @PostMapping("/{loanId}/prepay")
    public ResponseEntity<?> prepay(
            @PathVariable UUID loanId,
            @RequestBody Map<String, Object> body) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new NoSuchElementException("Loan not found: " + loanId));

        if (loan.getStatus() != LoanStatus.ACTIVE) {
            return ResponseEntity.badRequest().body(Map.of("message", "Loan is not active. Current status: " + loan.getStatus()));
        }

        Object amountObj = body.get("amount");
        if (amountObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Prepayment amount is required"));
        }
        BigDecimal prepayAmount = new BigDecimal(amountObj.toString()).setScale(2, RoundingMode.HALF_UP);
        if (prepayAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Prepayment amount must be greater than zero"));
        }
        if (prepayAmount.compareTo(loan.getOutstandingAmount()) > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Prepayment amount cannot exceed outstanding balance of ₹" + loan.getOutstandingAmount()));
        }

        BigDecimal penalty = prepayAmount.multiply(loan.getPrepaymentPenaltyRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalDebit = prepayAmount.add(penalty);

        // Resolve account to debit
        UUID accountId = null;
        if (body.get("accountId") != null && !body.get("accountId").toString().isBlank()) {
            try {
                accountId = UUID.fromString(body.get("accountId").toString());
            } catch (Exception ignored) {}
        }
        if (accountId == null) {
            accountId = loan.getAccountId();
        }
        if (accountId == null && loan.getCustomerId() != null) {
            accountId = coreBankingClient.getCustomerFirstActiveAccountId(loan.getCustomerId());
        }

        if (accountId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "No active bank account found for customer to debit payment of ₹" + totalDebit
            ));
        }

        // DEBIT ACCOUNT IN CORE BANKING
        CoreBankingClient.DebitResult debitResult = coreBankingClient.debitAccount(
                accountId, totalDebit, "Loan Prepayment - Loan " + String.valueOf(loan.getId()).substring(0, 8)
        );

        if (!debitResult.success()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Payment failed: " + debitResult.errorMessage()
            ));
        }

        // Only after account is debited successfully, reduce loan outstanding amount
        BigDecimal newOutstanding = loan.getOutstandingAmount().subtract(prepayAmount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        loan.setOutstandingAmount(newOutstanding);
        if (newOutstanding.compareTo(BigDecimal.ZERO) == 0) {
            loan.setStatus(LoanStatus.CLOSED);
        }
        loanRepository.save(loan);

        // Record audit
        loanAuditService.record("LOAN_PREPAYMENT", "Loan", loan.getId(), "customer",
                "Prepayment: amount=" + prepayAmount + ", debitedAccount=" + accountId + ", newOutstanding=" + newOutstanding);

        return ResponseEntity.ok(Map.of(
                "prepayAmount", prepayAmount,
                "penalty", penalty,
                "totalDebit", totalDebit,
                "debitedAccountId", accountId,
                "newOutstanding", newOutstanding,
                "loanStatus", loan.getStatus()
        ));
    }

    @PostMapping("/{loanId}/foreclose")
    public ResponseEntity<?> foreclose(
            @PathVariable UUID loanId,
            @RequestBody(required = false) Map<String, Object> body) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new NoSuchElementException("Loan not found: " + loanId));
        BigDecimal outstanding = loan.getOutstandingAmount();
        BigDecimal penalty = outstanding.multiply(loan.getForeclosurePenaltyRate()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalDue = outstanding.add(penalty);

        UUID accountId = null;
        if (body != null && body.get("accountId") != null && !body.get("accountId").toString().isBlank()) {
            try {
                accountId = UUID.fromString(body.get("accountId").toString());
            } catch (Exception ignored) {}
        }
        if (accountId == null) {
            accountId = loan.getAccountId();
        }
        if (accountId == null && loan.getCustomerId() != null) {
            accountId = coreBankingClient.getCustomerFirstActiveAccountId(loan.getCustomerId());
        }

        if (accountId != null && totalDue.compareTo(BigDecimal.ZERO) > 0) {
            CoreBankingClient.DebitResult debitResult = coreBankingClient.debitAccount(
                    accountId, totalDue, "Loan Foreclosure - Loan " + String.valueOf(loan.getId()).substring(0, 8)
            );
            if (!debitResult.success()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Foreclosure payment failed: " + debitResult.errorMessage()
                ));
            }
        }

        loan.setOutstandingAmount(BigDecimal.ZERO);
        loan.setStatus(LoanStatus.FORECLOSED);
        loanRepository.save(loan);

        loanAuditService.record("LOAN_FORECLOSED", "Loan", loan.getId(), "staff",
                "Loan foreclosed: settledAmount=" + outstanding + ", penalty=" + penalty);

        return ResponseEntity.ok(Map.of(
                "outstandingSettled", outstanding,
                "foreclosurePenalty", penalty,
                "totalDue", totalDue,
                "loanStatus", loan.getStatus()
        ));
    }
}
