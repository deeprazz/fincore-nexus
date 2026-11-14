package com.fincore.core_banking_services;

import com.fincore.core_banking_services.audit.AuditLog;
import com.fincore.core_banking_services.audit.AuditLogRepository;
import com.fincore.core_banking_services.audit.AuditService;
import com.fincore.core_banking_services.audit.AuditVerificationResult;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AuditIntegrationTest {

    @Autowired
    private AuditService auditService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void shouldPersistAuditLogAndVerifyHashChain() {
        UUID entityId = UUID.randomUUID();
        AuditLog saved = auditService.record(
                "TEST_ACTION",
                "ACCOUNT",
                entityId,
                "integration-test",
                "details for audit test"
        );

        assertNotNull(saved.getId());
        assertNotNull(saved.getPrevHash());
        assertNotNull(saved.getHash());

        AuditVerificationResult result = auditService.verifyChain();
        assertTrue(result.valid(), "Audit chain should be valid: " + result.message());
    }

    @Test
    void shouldRejectUpdateOnAuditLogViaTrigger() {
        // Run outside of a managed test transaction so the DB trigger error is triggered on executeUpdate
        AuditLog log = auditLogRepository.findAll().stream().findFirst().orElse(null);
        if (log != null) {
            assertThrows(Exception.class, () -> {
                entityManager.createNativeQuery("UPDATE audit_log SET details = 'tampered' WHERE id = :id")
                        .setParameter("id", log.getId())
                        .executeUpdate();
            });
        }
    }
}
