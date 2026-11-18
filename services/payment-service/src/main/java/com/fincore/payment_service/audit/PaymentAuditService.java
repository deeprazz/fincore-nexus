package com.fincore.payment_service.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class PaymentAuditService {

    public static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

    private final PaymentAuditLogRepository repository;

    public PaymentAuditService(PaymentAuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public synchronized PaymentAuditLog record(String action, String entityType, UUID entityId, String actor, String details) {
        String prevHash = repository.findFirstByOrderByCreatedAtDesc()
                .map(PaymentAuditLog::getHash)
                .filter(h -> h != null && !h.isBlank())
                .orElse(GENESIS_HASH);

        PaymentAuditLog log = new PaymentAuditLog(action, entityType, entityId, actor != null ? actor : "system", details);
        log.setPrevHash(prevHash);

        if (log.getId() == null) {
            log.setId(UUID.randomUUID());
        }

        String hash = computeHash(
                prevHash,
                log.getId(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getActor(),
                log.getDetails(),
                log.getCreatedAt()
        );
        log.setHash(hash);

        return repository.save(log);
    }

    @Transactional(readOnly = true)
    public AuditVerificationResult verifyChain() {
        List<PaymentAuditLog> allLogs = repository.findAllByOrderByCreatedAtAsc();
        if (allLogs.isEmpty()) {
            return new AuditVerificationResult(true, null, null, "Payment audit log is empty; genesis state intact.", 0);
        }

        String expectedPrevHash = GENESIS_HASH;

        for (int i = 0; i < allLogs.size(); i++) {
            PaymentAuditLog log = allLogs.get(i);

            // 1. Verify previous hash pointer link
            if (!Objects.equals(log.getPrevHash(), expectedPrevHash)) {
                return new AuditVerificationResult(
                        false,
                        log.getId(),
                        i,
                        "Payment audit hash chain broken at sequence " + i + " (id=" + log.getId() + "): expected prev_hash "
                                + expectedPrevHash + " but found " + log.getPrevHash(),
                        i
                );
            }

            // 2. Recompute row hash
            String computedHash = computeHash(
                    log.getPrevHash(),
                    log.getId(),
                    log.getAction(),
                    log.getEntityType(),
                    log.getEntityId(),
                    log.getActor(),
                    log.getDetails(),
                    log.getCreatedAt()
            );

            if (!Objects.equals(log.getHash(), computedHash)) {
                return new AuditVerificationResult(
                        false,
                        log.getId(),
                        i,
                        "Tamper detected in payment audit log at sequence " + i + " (id=" + log.getId() + "): stored hash "
                                + log.getHash() + " does not match computed hash " + computedHash,
                        i
                );
            }

            expectedPrevHash = log.getHash();
        }

        return new AuditVerificationResult(
                true,
                null,
                null,
                "Payment audit chain verified: " + allLogs.size() + " immutable records intact.",
                allLogs.size()
        );
    }

    public static String computeHash(
            String prevHash,
            UUID id,
            String action,
            String entityType,
            UUID entityId,
            String actor,
            String details,
            Instant createdAt) {

        long ms = createdAt != null ? createdAt.toEpochMilli() : 0L;
        String raw = String.format("%s:%s:%s:%s:%s:%s:%s:%d",
                prevHash != null ? prevHash : "",
                id != null ? id.toString() : "",
                action != null ? action : "",
                entityType != null ? entityType : "",
                entityId != null ? entityId.toString() : "",
                actor != null ? actor : "",
                details != null ? details : "",
                ms
        );

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
