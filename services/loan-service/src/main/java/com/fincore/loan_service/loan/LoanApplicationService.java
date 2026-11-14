package com.fincore.loan_service.loan;

import com.fincore.loan_service.client.CoreBankingClient;
import com.fincore.loan_service.credit.CreditAssessmentEngine;
import com.fincore.loan_service.credit.CreditAssessmentResult;
import com.fincore.loan_service.emi.EmiCalculator;
import com.fincore.loan_service.emi.EmiSchedule;
import com.fincore.loan_service.emi.EmiScheduleRepository;
import com.fincore.loan_service.emi.EmiStatus;
import com.fincore.loan_service.event.*;
import com.fincore.loan_service.saga.SagaInstance;
import com.fincore.loan_service.saga.SagaInstanceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class LoanApplicationService {

    private static final Logger log = LoggerFactory.getLogger(LoanApplicationService.class);

    private final LoanApplicationRepository applicationRepository;
    private final LoanRepository loanRepository;
    private final EmiScheduleRepository emiScheduleRepository;
    private final SagaInstanceRepository sagaInstanceRepository;
    private final LoanEventRepository loanEventRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final CreditAssessmentEngine creditEngine;
    private final EmiCalculator emiCalculator;
    private final CoreBankingClient coreBankingClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public LoanApplicationService(
            LoanApplicationRepository applicationRepository,
            LoanRepository loanRepository,
            EmiScheduleRepository emiScheduleRepository,
            SagaInstanceRepository sagaInstanceRepository,
            LoanEventRepository loanEventRepository,
            ProcessedEventRepository processedEventRepository,
            CreditAssessmentEngine creditEngine,
            EmiCalculator emiCalculator,
            CoreBankingClient coreBankingClient,
            KafkaTemplate<String, Object> kafkaTemplate) {
        this.applicationRepository = applicationRepository;
        this.loanRepository = loanRepository;
        this.emiScheduleRepository = emiScheduleRepository;
        this.sagaInstanceRepository = sagaInstanceRepository;
        this.loanEventRepository = loanEventRepository;
        this.processedEventRepository = processedEventRepository;
        this.creditEngine = creditEngine;
        this.emiCalculator = emiCalculator;
        this.coreBankingClient = coreBankingClient;
        this.kafkaTemplate = kafkaTemplate;
    }

    public LoanApplication submitApplication(LoanApplicationRequest req) {
        // Check KYC
        String kycStatus = coreBankingClient.getCustomerKycStatus(req.getCustomerId());
        if (!"VERIFIED".equals(kycStatus)) {
            throw new IllegalStateException("Customer KYC not verified. KYC status: " + kycStatus);
        }

        // Count overdue EMIs for this customer
        int overdueCount = (int) emiScheduleRepository.findOverdueEmis().stream()
                .filter(e -> {
                    // Check if this emi belongs to a loan of this customer
                    return loanRepository.findById(e.getLoanId())
                            .map(l -> l.getCustomerId().equals(req.getCustomerId()))
                            .orElse(false);
                }).count();

        // Run credit assessment
        CreditAssessmentResult result = creditEngine.assess(
                req.getAnnualIncome(),
                req.getRequestedAmount(),
                req.getTenureMonths(),
                true, // already verified above
                req.getExistingObligations() != null ? req.getExistingObligations() : BigDecimal.ZERO,
                overdueCount
        );

        LoanApplication app = new LoanApplication();
        app.setCustomerId(req.getCustomerId());
        app.setRequestedAmount(req.getRequestedAmount());
        app.setTenureMonths(req.getTenureMonths());
        app.setPurpose(req.getPurpose());
        app.setAnnualIncome(req.getAnnualIncome());
        app.setEmploymentType(req.getEmploymentType());
        app.setExistingObligations(req.getExistingObligations() != null ? req.getExistingObligations() : BigDecimal.ZERO);
        app.setCreditScore(result.getScore());

        if ("REJECTED".equals(result.getDecision())) {
            app.setStatus(ApplicationStatus.REJECTED);
            app.setRejectionReason(result.getReason());
        } else {
            // APPROVED or MANUAL_REVIEW -> UNDER_REVIEW
            app.setStatus(ApplicationStatus.UNDER_REVIEW);
        }

        LoanApplication saved = applicationRepository.save(app);
        recordEvent(null, saved.getId(), "APPLICATION_SUBMITTED", "{\"score\":" + result.getScore() + ",\"decision\":\"" + result.getDecision() + "\"}");
        return saved;
    }

    public LoanApplication approve(UUID applicationId, String reviewerId) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        if (app.getStatus() != ApplicationStatus.UNDER_REVIEW) {
            throw new IllegalStateException("Cannot approve application in status: " + app.getStatus());
        }

        app.setStatus(ApplicationStatus.APPROVED);
        app.setReviewerId(reviewerId);
        app.setReviewedAt(OffsetDateTime.now());
        applicationRepository.save(app);

        // Determine interest rate from credit score
        int score = app.getCreditScore() != null ? app.getCreditScore() : 600;
        double rate = score >= 800 ? 0.08 : score >= 700 ? 0.10 : 0.14;

        // Create loan record
        BigDecimal emi = emiCalculator.calculateEmi(app.getRequestedAmount(), rate, app.getTenureMonths());
        Loan loan = new Loan();
        loan.setApplicationId(app.getId());
        loan.setCustomerId(app.getCustomerId());
        loan.setPrincipalAmount(app.getRequestedAmount());
        loan.setOutstandingAmount(app.getRequestedAmount());
        loan.setInterestRate(BigDecimal.valueOf(rate));
        loan.setTenureMonths(app.getTenureMonths());
        loan.setEmiAmount(emi);
        loan.setStatus(LoanStatus.PENDING_DISBURSEMENT);
        Loan savedLoan = loanRepository.save(loan);

        // Start SAGA
        UUID correlationId = UUID.randomUUID();
        SagaInstance saga = new SagaInstance();
        saga.setLoanId(savedLoan.getId());
        saga.setCurrentStep("AWAITING_DISBURSEMENT");
        saga.setStatus("STARTED");
        saga.setCorrelationId(correlationId);
        sagaInstanceRepository.save(saga);

        // Publish loan.approved event (Kafka)
        // accountId not known yet — will be provided or looked up
        // For now publish with null accountId; core banking will credit first linked account
        LoanApprovedEvent event = new LoanApprovedEvent(
                correlationId,
                savedLoan.getId(),
                savedLoan.getCustomerId(),
                null, // accountId - will be resolved by core banking consumer
                savedLoan.getPrincipalAmount(),
                "INR"
        );
        kafkaTemplate.send("loan.approved", correlationId.toString(), event);
        recordEvent(savedLoan.getId(), app.getId(), "LOAN_APPROVED", "{\"correlationId\":\"" + correlationId + "\"}");
        return app;
    }

    public LoanApplication reject(UUID applicationId, String reviewerId, String reason) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        if (app.getStatus() != ApplicationStatus.UNDER_REVIEW) {
            throw new IllegalStateException("Cannot reject application in status: " + app.getStatus());
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setReviewerId(reviewerId);
        app.setReviewedAt(OffsetDateTime.now());
        app.setRejectionReason(reason);
        applicationRepository.save(app);
        recordEvent(null, app.getId(), "APPLICATION_REJECTED", "{\"reason\":\"" + reason + "\"}");
        return app;
    }

    /**
     * Called by Kafka consumer when loan.disbursed event arrives from core banking.
     */
    public void handleDisbursed(LoanDisbursedEvent event) {
        if (processedEventRepository.existsByIdempotencyKey("disbursed:" + event.correlationId())) {
            log.info("Already processed disbursement for correlationId={}", event.correlationId());
            return;
        }

        SagaInstance saga = sagaInstanceRepository.findByCorrelationId(event.correlationId())
                .orElseThrow(() -> new IllegalArgumentException("Saga not found for correlation: " + event.correlationId()));

        Loan loan = loanRepository.findById(saga.getLoanId())
                .orElseThrow(() -> new IllegalArgumentException("Loan not found: " + saga.getLoanId()));

        if (event.success()) {
            loan.setStatus(LoanStatus.ACTIVE);
            loan.setDisbursedAt(event.disbursedAt() != null ? event.disbursedAt() : OffsetDateTime.now());
            loan.setAccountId(event.accountId());
            LocalDate startDate = loan.getDisbursedAt().toLocalDate().plusMonths(1);
            loan.setStartDate(startDate);
            loan.setEndDate(startDate.plusMonths(loan.getTenureMonths() - 1));
            loanRepository.save(loan);

            // Generate EMI schedule
            generateEmiSchedule(loan, startDate);

            saga.setStatus("COMPLETED");
            saga.setCurrentStep("DISBURSED");
            sagaInstanceRepository.save(saga);

            // Update application status
            applicationRepository.findById(loan.getApplicationId())
                    .ifPresent(a -> { a.setStatus(ApplicationStatus.DISBURSED); applicationRepository.save(a); });

            recordEvent(loan.getId(), loan.getApplicationId(), "LOAN_DISBURSED",
                    "{\"accountId\":\"" + event.accountId() + "\",\"amount\":\"" + event.disbursedAmount() + "\"}");
        } else {
            saga.setStatus("FAILED");
            saga.setCurrentStep("DISBURSEMENT_FAILED");
            saga.setErrorMessage(event.failureReason());
            sagaInstanceRepository.save(saga);
            loan.setStatus(LoanStatus.PENDING_DISBURSEMENT);
            loanRepository.save(loan);
            recordEvent(loan.getId(), loan.getApplicationId(), "DISBURSEMENT_FAILED",
                    "{\"reason\":\"" + event.failureReason() + "\"}");
        }

        ProcessedEvent pe = new ProcessedEvent();
        pe.setIdempotencyKey("disbursed:" + event.correlationId());
        processedEventRepository.save(pe);
    }

    public void generateEmiSchedule(Loan loan, LocalDate firstDueDate) {
        List<EmiCalculator.EmiScheduleEntry> schedule = emiCalculator.generateSchedule(
                loan.getPrincipalAmount(),
                loan.getInterestRate().doubleValue(),
                loan.getTenureMonths(),
                firstDueDate
        );

        for (EmiCalculator.EmiScheduleEntry entry : schedule) {
            EmiSchedule emi = new EmiSchedule();
            emi.setLoanId(loan.getId());
            emi.setInstallmentNumber(entry.installmentNumber());
            emi.setDueDate(entry.dueDate());
            emi.setEmiAmount(entry.emiAmount());
            emi.setPrincipalComponent(entry.principalComponent());
            emi.setInterestComponent(entry.interestComponent());
            emi.setOutstandingAfter(entry.outstandingAfter());
            emi.setStatus(EmiStatus.PENDING);
            emiScheduleRepository.save(emi);
        }
    }

    private void recordEvent(UUID loanId, UUID applicationId, String eventType, String payload) {
        LoanEvent ev = new LoanEvent();
        ev.setLoanId(loanId);
        ev.setApplicationId(applicationId);
        ev.setEventType(eventType);
        ev.setPayload(payload);
        loanEventRepository.save(ev);
    }
}
