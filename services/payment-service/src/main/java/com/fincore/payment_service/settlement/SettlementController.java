package com.fincore.payment_service.settlement;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settlement")
public class SettlementController {

    private final SettlementEngine settlementEngine;

    public SettlementController(SettlementEngine settlementEngine) {
        this.settlementEngine = settlementEngine;
    }

    @GetMapping("/report")
    public ResponseEntity<SettlementReportResponse> getReport() {
        return ResponseEntity.ok(settlementEngine.generateReconciliationReport());
    }

    @PostMapping("/neft/batch")
    public ResponseEntity<SettlementBatch> triggerNeftBatch() {
        SettlementBatch batch = settlementEngine.processNeftBatch();
        return ResponseEntity.ok(batch);
    }
}
