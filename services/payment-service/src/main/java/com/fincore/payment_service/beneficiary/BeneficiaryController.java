package com.fincore.payment_service.beneficiary;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @PostMapping
    public ResponseEntity<BeneficiaryResponse> add(@Valid @RequestBody BeneficiaryRequest req) {
        return ResponseEntity.ok(beneficiaryService.addBeneficiary(req));
    }

    @GetMapping
    public ResponseEntity<List<BeneficiaryResponse>> list(@RequestParam(required = false) UUID customerId) {
        return ResponseEntity.ok(beneficiaryService.getBeneficiaries(customerId));
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<BeneficiaryResponse> verifyPennyDrop(@PathVariable UUID id) {
        return ResponseEntity.ok(beneficiaryService.verifyPennyDrop(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        beneficiaryService.deleteBeneficiary(id);
        return ResponseEntity.noContent().build();
    }
}
