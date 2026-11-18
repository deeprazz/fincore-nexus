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

    @GetMapping("/reconciliation")
    public ResponseEntity<ReconciliationReportResponse> getReconciliation() {
        return ResponseEntity.ok(settlementEngine.reconcileWithCoreLedger());
    }

    @PostMapping("/neft/batch")
    public ResponseEntity<SettlementBatch> triggerNeftBatch() {
        SettlementBatch batch = settlementEngine.processNeftBatch();
        return ResponseEntity.ok(batch);
    }
}
