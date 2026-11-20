package com.fincore.payment_service.settlement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SettlementScheduler {

    private static final Logger log = LoggerFactory.getLogger(SettlementScheduler.class);
    private final SettlementEngine settlementEngine;

    public SettlementScheduler(SettlementEngine settlementEngine) {
        this.settlementEngine = settlementEngine;
    }

    /**
     * NEFT batch settlement schedule (configurable, defaults to half-hourly batch: 1800000 ms).
     */
    @Scheduled(fixedRateString = "${fincore.settlement.neft-rate-ms:1800000}")
    public void runNeftBatchSettlement() {
        log.info("Running scheduled NEFT settlement batch...");
        try {
            settlementEngine.processNeftBatch();
        } catch (Exception e) {
            log.error("Error running NEFT batch settlement: {}", e.getMessage(), e);
        }
    }
}
