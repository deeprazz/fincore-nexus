package com.fincore.kyc_service.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class KycAuditService {

    public static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    private final KycAuditRepository repository;

    public KycAuditService(KycAuditRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public KycAuditLog logEvent(String eventType, String entityId, String performedBy, String details) {
        Optional<KycAuditLog> last = repository.findTopByOrderByIdDesc();
        String prevHash = last.map(KycAuditLog::getHash).orElse(GENESIS_HASH);

        Instant now = Instant.now();
        String computedHash = calculateHash(prevHash, eventType, entityId, performedBy, details, now);

        KycAuditLog entry = new KycAuditLog();
        entry.setEventType(eventType);
        entry.setEntityId(entityId);
        entry.setPerformedBy(performedBy != null ? performedBy : "SYSTEM");
        entry.setDetails(details);
        entry.setPrevHash(prevHash);
        entry.setHash(computedHash);
        entry.setCreatedAt(now);

        return repository.save(entry);
    }

    @Transactional(readOnly = true)
    public AuditVerificationResult verifyChain() {
        List<KycAuditLog> entries = repository.findAllByOrderByIdAsc();
        if (entries.isEmpty()) {
            return new AuditVerificationResult(true, 0, null, "Audit log is empty, genesis state verified");
        }

        String expectedPrevHash = GENESIS_HASH;

        for (KycAuditLog entry : entries) {
            // Verify link
            if (!expectedPrevHash.equals(entry.getPrevHash())) {
                return new AuditVerificationResult(
                        false,
                        entries.size(),
                        entry.getId(),
                        "Broken chain link at id " + entry.getId() + ": expected prev_hash " + expectedPrevHash + " but found " + entry.getPrevHash()
                );
            }

            // Verify hash computation
            String recomputedHash = calculateHash(
                    entry.getPrevHash(),
                    entry.getEventType(),
                    entry.getEntityId(),
                    entry.getPerformedBy(),
                    entry.getDetails(),
                    entry.getCreatedAt()
            );

            if (!recomputedHash.equals(entry.getHash())) {
                return new AuditVerificationResult(
                        false,
                        entries.size(),
                        entry.getId(),
                        "Data tampering detected at id " + entry.getId() + ": recomputed hash does not match stored hash"
                );
            }

            expectedPrevHash = entry.getHash();
        }

        return new AuditVerificationResult(true, entries.size(), null, "Cryptographic audit chain completely verified (" + entries.size() + " entries)");
    }

    public static String calculateHash(String prevHash, String eventType, String entityId, String performedBy, String details, Instant createdAt) {
        String data = (prevHash != null ? prevHash : "") + "|"
                + (eventType != null ? eventType : "") + "|"
                + (entityId != null ? entityId : "") + "|"
                + (performedBy != null ? performedBy : "") + "|"
                + (details != null ? details : "") + "|"
                + (createdAt != null ? createdAt.toString() : "");

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
