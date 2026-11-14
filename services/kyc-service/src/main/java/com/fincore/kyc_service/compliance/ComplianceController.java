package com.fincore.kyc_service.compliance;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/compliance")
public class ComplianceController {

    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @GetMapping("/pci-dss")
    public ResponseEntity<PciDssReportResponse> getPciDssReport() {
        return ResponseEntity.ok(complianceService.evaluatePciDssCompliance());
    }

    @GetMapping("/audit/verify")
    public ResponseEntity<Map<String, Object>> verifyAuditIntegrity() {
        return ResponseEntity.ok(complianceService.verifySystemAuditChains());
    }
}
