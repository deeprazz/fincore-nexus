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
    public void onLoanDisbursed(Object payload) {
        LoanDisbursedEvent event = null;
        if (payload instanceof LoanDisbursedEvent e) {
            event = e;
        } else if (payload instanceof com.fincore.core_banking_services.events.LoanDisbursedResponse r) {
            event = new LoanDisbursedEvent(
                    r.correlationId(),
                    r.loanId(),
                    r.accountId(),
                    r.disbursedAmount(),
                    r.disbursedAt(),
                    r.success(),
                    r.failureReason()
            );
        }
        if (event == null) {
            log.warn("Unknown loan.disbursed payload: {}", payload);
            return;
        }
        log.info("Received loan.disbursed event: correlationId={}", event.correlationId());
        try {
            loanApplicationService.handleDisbursed(event);
        } catch (Exception e) {
            log.error("Error handling loan.disbursed event: {}", e.getMessage(), e);
        }
    }
}
