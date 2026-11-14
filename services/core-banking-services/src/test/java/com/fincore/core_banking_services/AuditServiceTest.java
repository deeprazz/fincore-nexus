package com.fincore.core_banking_services;

import com.fincore.core_banking_services.audit.AuditLog;
import com.fincore.core_banking_services.audit.AuditLogRepository;
import com.fincore.core_banking_services.audit.AuditService;
import com.fincore.core_banking_services.audit.AuditVerificationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository repository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(repository);
    }

    @Test
    void shouldComputeGenesisPrevHashWhenEmpty() {
        when(repository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.empty());
        when(repository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID entityId = UUID.randomUUID();
        AuditLog recorded = auditService.record("TEST_ACTION", "ACCOUNT", entityId, "teller", "test details");

        assertNotNull(recorded);
        assertEquals(AuditService.GENESIS_HASH, recorded.getPrevHash());
        assertNotNull(recorded.getHash());
        assertEquals(64, recorded.getHash().length());
        verify(repository).save(any(AuditLog.class));
    }

    @Test
    void shouldChainHashesSequentially() {
        AuditLog previous = new AuditLog("PREV_ACTION", "ACCOUNT", UUID.randomUUID(), "teller", "prev details");
        previous.setPrevHash(AuditService.GENESIS_HASH);
        previous.setHash("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        when(repository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.of(previous));
        when(repository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditLog recorded = auditService.record("NEXT_ACTION", "ACCOUNT", UUID.randomUUID(), "teller", "next details");

        assertEquals("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", recorded.getPrevHash());
        assertNotNull(recorded.getHash());
        assertNotEquals(recorded.getPrevHash(), recorded.getHash());
    }

    @Test
    void shouldVerifyValidChainSuccessfully() {
        Instant t1 = Instant.now().minusSeconds(10);
        Instant t2 = Instant.now().minusSeconds(5);

        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();

        String prevHash1 = AuditService.GENESIS_HASH;
        String hash1 = AuditService.computeHash(prevHash1, id1, "ACTION_1", "ACCOUNT", null, "teller", "details 1", t1);

        AuditLog log1 = new AuditLog("ACTION_1", "ACCOUNT", null, "teller", "details 1", prevHash1, hash1);
        org.springframework.test.util.ReflectionTestUtils.setField(log1, "id", id1);
        log1.setCreatedAt(t1);

        String prevHash2 = hash1;
        String hash2 = AuditService.computeHash(prevHash2, id2, "ACTION_2", "ACCOUNT", null, "teller", "details 2", t2);
        AuditLog log2 = new AuditLog("ACTION_2", "ACCOUNT", null, "teller", "details 2", prevHash2, hash2);
        org.springframework.test.util.ReflectionTestUtils.setField(log2, "id", id2);
        log2.setCreatedAt(t2);

        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(List.of(log1, log2));

        AuditVerificationResult result = auditService.verifyChain();
        assertTrue(result.valid());
        assertNull(result.brokenRowId());
        assertEquals(2, result.verifiedRowsCount());
    }

    @Test
    void shouldDetectTamperedRowData() {
        Instant t1 = Instant.now();
        UUID id1 = UUID.randomUUID();
        String prevHash1 = AuditService.GENESIS_HASH;
        String hash1 = AuditService.computeHash(prevHash1, id1, "ACTION_1", "ACCOUNT", null, "teller", "original details", t1);

        // Tamper with details after hash computed
        AuditLog log1 = new AuditLog("ACTION_1", "ACCOUNT", null, "teller", "TAMPERED details", prevHash1, hash1);
        org.springframework.test.util.ReflectionTestUtils.setField(log1, "id", id1);
        log1.setCreatedAt(t1);

        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(List.of(log1));

        AuditVerificationResult result = auditService.verifyChain();
        assertFalse(result.valid());
        assertEquals(id1, result.brokenRowId());
        assertTrue(result.message().contains("Data tamper detected"));
    }

    @Test
    void shouldDetectBrokenLinkBetweenEntries() {
        Instant t1 = Instant.now().minusSeconds(10);
        Instant t2 = Instant.now().minusSeconds(5);
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();

        String prevHash1 = AuditService.GENESIS_HASH;
        String hash1 = AuditService.computeHash(prevHash1, id1, "ACTION_1", "ACCOUNT", null, "teller", "d1", t1);
        AuditLog log1 = new AuditLog("ACTION_1", "ACCOUNT", null, "teller", "d1", prevHash1, hash1);
        org.springframework.test.util.ReflectionTestUtils.setField(log1, "id", id1);
        log1.setCreatedAt(t1);

        // log2 has wrong prevHash (not pointing to hash1)
        String wrongPrevHash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        String hash2 = AuditService.computeHash(wrongPrevHash, id2, "ACTION_2", "ACCOUNT", null, "teller", "d2", t2);
        AuditLog log2 = new AuditLog("ACTION_2", "ACCOUNT", null, "teller", "d2", wrongPrevHash, hash2);
        org.springframework.test.util.ReflectionTestUtils.setField(log2, "id", id2);
        log2.setCreatedAt(t2);

        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(List.of(log1, log2));

        AuditVerificationResult result = auditService.verifyChain();
        assertFalse(result.valid());
        assertEquals(id2, result.brokenRowId());
        assertTrue(result.message().contains("Hash chain broken"));
    }
}
