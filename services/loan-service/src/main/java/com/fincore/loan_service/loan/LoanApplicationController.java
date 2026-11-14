package com.fincore.loan_service.loan;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/loans/applications")
public class LoanApplicationController {

    private final LoanApplicationService applicationService;
    private final LoanApplicationRepository applicationRepository;

    public LoanApplicationController(LoanApplicationService applicationService,
                                     LoanApplicationRepository applicationRepository) {
        this.applicationService = applicationService;
        this.applicationRepository = applicationRepository;
    }

    @PostMapping
    public ResponseEntity<LoanApplicationResponse> submit(@Valid @RequestBody LoanApplicationRequest req) {
        LoanApplication app = applicationService.submitApplication(req);
        return ResponseEntity.ok(LoanApplicationResponse.from(app));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LoanApplicationResponse> getById(@PathVariable UUID id) {
        return applicationRepository.findById(id)
                .map(app -> ResponseEntity.ok(LoanApplicationResponse.from(app)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<LoanApplicationResponse> getAll() {
        return applicationRepository.findAll().stream()
                .map(LoanApplicationResponse::from).collect(Collectors.toList());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<LoanApplicationResponse> approve(
            @PathVariable UUID id, Authentication auth) {
        LoanApplication app = applicationService.approve(id, auth.getName());
        return ResponseEntity.ok(LoanApplicationResponse.from(app));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<LoanApplicationResponse> reject(
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewRequest req,
            Authentication auth) {
        String reason = req != null ? req.getReason() : "Rejected by reviewer";
        LoanApplication app = applicationService.reject(id, auth.getName(), reason);
        return ResponseEntity.ok(LoanApplicationResponse.from(app));
    }
}
