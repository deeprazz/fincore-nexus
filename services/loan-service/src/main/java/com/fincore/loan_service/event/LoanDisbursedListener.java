package com.fincore.loan_service.event;

import com.fincore.loan_service.loan.LoanApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class LoanDisbursedListener {

    private static final Logger log = LoggerFactory.getLogger(LoanDisbursedListener.class);
    private final LoanApplicationService loanApplicationService;

    public LoanDisbursedListener(LoanApplicationService loanApplicationService) {
        this.loanApplicationService = loanApplicationService;
    }

    @KafkaListener(topics = "loan.disbursed", groupId = "loan-service")
    public void onLoanDisbursed(LoanDisbursedEvent event) {
        log.info("Received loan.disbursed event: correlationId={}", event.correlationId());
        try {
            loanApplicationService.handleDisbursed(event);
        } catch (Exception e) {
            log.error("Error handling loan.disbursed event: {}", e.getMessage(), e);
        }
    }
}
