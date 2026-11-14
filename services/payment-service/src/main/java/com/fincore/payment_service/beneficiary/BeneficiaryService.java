package com.fincore.payment_service.beneficiary;

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

    public BeneficiaryService(BeneficiaryRepository repository) {
        this.repository = repository;
    }

    public BeneficiaryResponse addBeneficiary(BeneficiaryRequest req) {
        Beneficiary b = new Beneficiary();
        b.setCustomerId(req.getCustomerId());
        b.setAccountNumber(req.getAccountNumber());
        b.setIfscCode(req.getIfscCode());
        b.setName(req.getName());
        b.setEmail(req.getEmail());
        b.setPhone(req.getPhone());
        b.setVpa(req.getVpa());
        b.setBankName(req.getBankName());
        b.setStatus(BeneficiaryStatus.PENDING);
        Beneficiary saved = repository.save(b);
        log.info("Added beneficiary {} for customer {}", saved.getId(), saved.getCustomerId());
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
        // Simulated penny-drop check: validates IFSC and account format
        if (b.getIfscCode() == null || b.getIfscCode().length() < 4) {
            b.setStatus(BeneficiaryStatus.REJECTED);
        } else {
            b.setStatus(BeneficiaryStatus.VERIFIED);
            b.setVerifiedAt(OffsetDateTime.now());
        }
        Beneficiary saved = repository.save(b);
        log.info("Simulated penny-drop verification for beneficiary {}: status={}", id, saved.getStatus());
        return BeneficiaryResponse.from(saved);
    }

    public void deleteBeneficiary(UUID id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Beneficiary not found: " + id);
        }
        repository.deleteById(id);
        log.info("Deleted beneficiary {}", id);
    }
}
