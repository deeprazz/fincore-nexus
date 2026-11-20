package com.fincore.payment_service.beneficiary;

import com.fincore.payment_service.audit.PaymentAuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class BeneficiaryService {

    private static final Logger log = LoggerFactory.getLogger(BeneficiaryService.class);
    private final BeneficiaryRepository repository;
    private final PaymentAuditService auditService;

    public BeneficiaryService(BeneficiaryRepository repository, PaymentAuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    private static final String IFSC_REGEX = "^[A-Z]{4}0[A-Z0-9]{6}$";
    private static final String ACCOUNT_REGEX = "^[0-9]{9,18}$";
    private static final String VPA_REGEX = "^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}$";

    public BeneficiaryResponse addBeneficiary(BeneficiaryRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new IllegalArgumentException("Beneficiary name is required");
        }
        if (req.getAccountNumber() != null && !req.getAccountNumber().isBlank()) {
            String acc = req.getAccountNumber().trim();
            if (!acc.matches(ACCOUNT_REGEX)) {
                throw new IllegalArgumentException("Invalid account number format: expected 9 to 18 digits");
            }
        }
        if (req.getIfscCode() != null && !req.getIfscCode().isBlank()) {
            String ifsc = req.getIfscCode().trim().toUpperCase();
            if (!ifsc.matches(IFSC_REGEX)) {
                throw new IllegalArgumentException("Invalid IFSC code format: " + ifsc + ". Expected 11 characters e.g. FINC0001234");
            }
        }
        if (req.getVpa() != null && !req.getVpa().isBlank()) {
            String vpa = req.getVpa().trim();
            if (!vpa.matches(VPA_REGEX)) {
                throw new IllegalArgumentException("Invalid UPI VPA format: " + vpa);
            }
        }

        Beneficiary b = new Beneficiary();
        b.setCustomerId(req.getCustomerId());
        b.setAccountNumber(req.getAccountNumber() != null ? req.getAccountNumber().trim() : null);
        b.setIfscCode(req.getIfscCode() != null ? req.getIfscCode().trim().toUpperCase() : null);
        b.setName(req.getName().trim());
        b.setEmail(req.getEmail());
        b.setPhone(req.getPhone());
        b.setVpa(req.getVpa() != null ? req.getVpa().trim() : null);
        b.setBankName(req.getBankName() != null ? req.getBankName().trim() : "Commercial Bank");
        b.setStatus(BeneficiaryStatus.PENDING);
        b.setVerificationDetails("Pending simulated penny-drop verification");
        Beneficiary saved = repository.save(b);
        log.info("Added beneficiary {} for customer {}", saved.getId(), saved.getCustomerId());
        auditService.record("BENEFICIARY_ADDED", "Beneficiary", saved.getId(), "user",
                "Beneficiary added: name=" + saved.getName() + ", acc=" + saved.getAccountNumber() + ", ifsc=" + saved.getIfscCode());
        return BeneficiaryResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<BeneficiaryResponse> getBeneficiaries(UUID customerId) {
        if (customerId != null) {
            return repository.findByCustomerId(customerId).stream().map(BeneficiaryResponse::from).collect(Collectors.toList());
        }
        return repository.findAll().stream().map(BeneficiaryResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Beneficiary getBeneficiaryEntity(UUID id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Beneficiary not found: " + id));
    }

    public BeneficiaryResponse verifyPennyDrop(UUID id) {
        Beneficiary b = getBeneficiaryEntity(id);
        String ifsc = b.getIfscCode() != null ? b.getIfscCode().trim().toUpperCase() : "";
        String acc = b.getAccountNumber() != null ? b.getAccountNumber().trim() : "";
        String vpa = b.getVpa() != null ? b.getVpa().trim() : "";

        // 1. Validate formats
        boolean ifscValid = ifsc.matches(IFSC_REGEX);
        boolean accValid = acc.matches(ACCOUNT_REGEX);
        boolean vpaValid = vpa.isEmpty() || vpa.matches(VPA_REGEX);

        String mockTxnRef = "SIM-PENNY-" + System.currentTimeMillis();

        if (!acc.isEmpty() && !accValid) {
            b.setStatus(BeneficiaryStatus.REJECTED);
            b.setVerificationDetails("SIMULATED Penny-Drop FAILED: Invalid account number format (must be 9-18 digits)");
            auditService.record("BENEFICIARY_REJECTED", "Beneficiary", b.getId(), "penny-drop-simulator",
                    "Simulated penny-drop rejected: invalid account format (" + acc + ")");
        } else if (!ifsc.isEmpty() && !ifscValid) {
            b.setStatus(BeneficiaryStatus.REJECTED);
            b.setVerificationDetails("SIMULATED Penny-Drop FAILED: Invalid IFSC format ('" + ifsc + "')");
            auditService.record("BENEFICIARY_REJECTED", "Beneficiary", b.getId(), "penny-drop-simulator",
                    "Simulated penny-drop rejected: invalid IFSC (" + ifsc + ")");
        } else if (!vpaValid) {
            b.setStatus(BeneficiaryStatus.REJECTED);
            b.setVerificationDetails("SIMULATED Penny-Drop FAILED: Invalid UPI VPA format ('" + vpa + "')");
            auditService.record("BENEFICIARY_REJECTED", "Beneficiary", b.getId(), "penny-drop-simulator",
                    "Simulated penny-drop rejected: invalid VPA (" + vpa + ")");
        } else if (acc.endsWith("9999") || "MISMATCH".equalsIgnoreCase(b.getName())) {
            // Simulated name mismatch
            b.setStatus(BeneficiaryStatus.REJECTED);
            b.setVerificationDetails("SIMULATED Penny-Drop FAILED: Account holder name mismatch with bank records (Ref: " + mockTxnRef + ")");
            auditService.record("BENEFICIARY_REJECTED", "Beneficiary", b.getId(), "penny-drop-simulator",
                    "Simulated penny-drop rejected: name mismatch for " + b.getName() + " (Ref: " + mockTxnRef + ")");
        } else {
            // Simulated ₹1.00 credit success and name match
            b.setStatus(BeneficiaryStatus.VERIFIED);
            b.setVerifiedAt(OffsetDateTime.now());
            b.setVerificationDetails("SIMULATED Penny-Drop ₹1.00 SUCCESS: NPCI mock name match confirmed ('" + b.getName() + "'), Ref: " + mockTxnRef);
            auditService.record("BENEFICIARY_VERIFIED", "Beneficiary", b.getId(), "penny-drop-simulator",
                    "Simulated penny-drop ₹1.00 verified: name match confirmed for " + b.getName() + " (Ref: " + mockTxnRef + ")");
        }

        Beneficiary saved = repository.save(b);
        log.info("Simulated penny-drop verification for beneficiary {}: status={}, details={}",
                id, saved.getStatus(), saved.getVerificationDetails());
        return BeneficiaryResponse.from(saved);
    }

    public void deleteBeneficiary(UUID id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Beneficiary not found: " + id);
        }
        repository.deleteById(id);
        log.info("Deleted beneficiary {}", id);
        auditService.record("BENEFICIARY_DELETED", "Beneficiary", id, "user",
                "Beneficiary deleted: " + id);
    }
}
