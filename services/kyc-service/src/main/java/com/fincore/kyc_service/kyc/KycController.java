package com.fincore.kyc_service.kyc;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/kyc")
public class KycController {

    private final KycService kycService;

    public KycController(KycService kycService) {
        this.kycService = kycService;
    }

    @PostMapping(value = "/onboard", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<KycResponse> onboard(
            @RequestParam("customerId") UUID customerId,
            @RequestParam("fullName") String fullName,
            @RequestParam("dateOfBirth") String dateOfBirth,
            @RequestParam("panNumber") String panNumber,
            @RequestParam("aadhaarNumber") String aadhaarNumber,
            @RequestParam(value = "livenessChallenge", required = false) String livenessChallenge,
            @RequestPart(value = "panFile", required = false) MultipartFile panFile,
            @RequestPart(value = "aadhaarFile", required = false) MultipartFile aadhaarFile,
            @RequestPart(value = "selfieFile", required = false) MultipartFile selfieFile,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "teller";
        KycOnboardRequest request = new KycOnboardRequest(
                customerId,
                fullName,
                LocalDate.parse(dateOfBirth),
                panNumber,
                aadhaarNumber,
                livenessChallenge
        );
        KycResponse response = kycService.onboard(request, panFile, aadhaarFile, selfieFile, username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<KycResponse> approve(
            @PathVariable UUID id,
            @Valid @RequestBody KycReviewRequest request,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "manager";
        KycResponse response = kycService.approve(id, request, username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<KycResponse> reject(
            @PathVariable UUID id,
            @Valid @RequestBody KycReviewRequest request,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "manager";
        KycResponse response = kycService.reject(id, request, username);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<KycResponse>> listAll() {
        return ResponseEntity.ok(kycService.listAll());
    }

    @GetMapping("/pending")
    public ResponseEntity<List<KycResponse>> listPending() {
        return ResponseEntity.ok(kycService.listPending());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KycResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(kycService.getById(id));
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID documentId) {
        KycService.DecryptedDocument doc = kycService.downloadDecryptedDocument(documentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.fileName() + "\"")
                .contentType(MediaType.parseMediaType(doc.contentType()))
                .body(doc.bytes());
    }
}
