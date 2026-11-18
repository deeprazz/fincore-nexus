package com.fincore.payment_service;

import com.fincore.payment_service.audit.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentAuditServiceTest {

    @Mock
    private PaymentAuditLogRepository repository;

    private PaymentAuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new PaymentAuditService(repository);
    }

    @Test
    @DisplayName("Should initialize genesis prev_hash when repository is empty")
    void shouldComputeGenesisPrevHashWhenEmpty() {
        when(repository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.empty());
        when(repository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID entityId = UUID.randomUUID();
        PaymentAuditLog recorded = auditService.record("PAYMENT_INITIATED", "Payment", entityId, "user", "Initiated");

        assertNotNull(recorded);
        assertEquals(PaymentAuditService.GENESIS_HASH, recorded.getPrevHash());
        assertNotNull(recorded.getHash());
        assertEquals(64, recorded.getHash().length());
        verify(repository).save(any(PaymentAuditLog.class));
    }

    @Test
    @DisplayName("Should sequentially link hashes across entries")
    void shouldChainHashesSequentially() {
        PaymentAuditLog previous = new PaymentAuditLog("PAYMENT_INITIATED", "Payment", UUID.randomUUID(), "user", "First");
        previous.setPrevHash(PaymentAuditService.GENESIS_HASH);
        previous.setHash("1111111111111111111111111111111111111111111111111111111111111111");

        when(repository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.of(previous));
        when(repository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentAuditLog recorded = auditService.record("PAYMENT_SETTLED", "Payment", UUID.randomUUID(), "settlement-engine", "Second");

        assertEquals("1111111111111111111111111111111111111111111111111111111111111111", recorded.getPrevHash());
        assertNotNull(recorded.getHash());
        assertNotEquals(recorded.getPrevHash(), recorded.getHash());
    }

    @Test
    @DisplayName("Should verify valid audit chain successfully")
    void shouldVerifyValidChainSuccessfully() {
        Instant t1 = Instant.now().minusSeconds(10);
        Instant t2 = Instant.now().minusSeconds(5);
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();

        String prevHash1 = PaymentAuditService.GENESIS_HASH;
        String hash1 = PaymentAuditService.computeHash(prevHash1, id1, "PAYMENT_INITIATED", "Payment", null, "user", "d1", t1);
        PaymentAuditLog log1 = new PaymentAuditLog("PAYMENT_INITIATED", "Payment", null, "user", "d1");
        log1.setId(id1);
        log1.setCreatedAt(t1);
        log1.setPrevHash(prevHash1);
        log1.setHash(hash1);

        String prevHash2 = hash1;
        String hash2 = PaymentAuditService.computeHash(prevHash2, id2, "PAYMENT_SETTLED", "Payment", null, "settlement-engine", "d2", t2);
        PaymentAuditLog log2 = new PaymentAuditLog("PAYMENT_SETTLED", "Payment", null, "settlement-engine", "d2");
        log2.setId(id2);
        log2.setCreatedAt(t2);
        log2.setPrevHash(prevHash2);
        log2.setHash(hash2);

        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(List.of(log1, log2));

        AuditVerificationResult result = auditService.verifyChain();
        assertTrue(result.valid());
        assertNull(result.brokenEntityId());
        assertEquals(2, result.totalEntries());
    }

    @Test
    @DisplayName("Tampering with a row makes verify report the first broken row")
    void tamperingWithRowReportsBrokenRow() {
        Instant t1 = Instant.now();
        UUID id1 = UUID.randomUUID();
        String prevHash1 = PaymentAuditService.GENESIS_HASH;
        String hash1 = PaymentAuditService.computeHash(prevHash1, id1, "PAYMENT_INITIATED", "Payment", null, "user", "original details", t1);

        // Corrupt details after hash computed
        PaymentAuditLog log1 = new PaymentAuditLog("PAYMENT_INITIATED", "Payment", null, "user", "TAMPERED details");
        log1.setId(id1);
        log1.setCreatedAt(t1);
        log1.setPrevHash(prevHash1);
        log1.setHash(hash1);

        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(List.of(log1));

        AuditVerificationResult result = auditService.verifyChain();
        assertFalse(result.valid());
        assertEquals(id1, result.brokenEntityId());
        assertEquals(0, result.brokenSequenceNumber());
        assertTrue(result.message().contains("Tamper detected in payment audit log"));
    }
}
