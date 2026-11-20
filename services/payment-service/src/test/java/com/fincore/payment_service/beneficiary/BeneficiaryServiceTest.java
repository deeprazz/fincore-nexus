package com.fincore.payment_service.beneficiary;

import com.fincore.payment_service.audit.PaymentAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BeneficiaryServiceTest {

    private BeneficiaryRepository beneficiaryRepository;
    private PaymentAuditService auditService;
    private BeneficiaryService beneficiaryService;

    @BeforeEach
    void setUp() {
        beneficiaryRepository = Mockito.mock(BeneficiaryRepository.class);
        auditService = Mockito.mock(PaymentAuditService.class);
        beneficiaryService = new BeneficiaryService(beneficiaryRepository, auditService);
    }

    private BeneficiaryRequest createRequest(String name, String account, String ifsc, String vpa) {
        BeneficiaryRequest req = new BeneficiaryRequest();
        req.setCustomerId(UUID.randomUUID());
        req.setName(name);
        req.setAccountNumber(account);
        req.setIfscCode(ifsc);
        req.setBankName("HDFC Bank");
        req.setVpa(vpa);
        return req;
    }

    @Test
    void testAddBeneficiary_success() {
        BeneficiaryRequest request = createRequest("Rahul Sharma", "123456789012", "HDFC0001234", "rahul@okhdfcbank");

        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(inv -> {
            Beneficiary b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        BeneficiaryResponse res = beneficiaryService.addBeneficiary(request);

        assertNotNull(res);
        assertEquals("Rahul Sharma", res.name());
        assertEquals(BeneficiaryStatus.PENDING, res.status());
        verify(auditService).record(eq("BENEFICIARY_ADDED"), eq("Beneficiary"), any(), any(), contains("Rahul Sharma"));
    }

    @Test
    void testAddBeneficiary_invalidIfsc_throwsIllegalArgument() {
        BeneficiaryRequest request = createRequest("Rahul Sharma", "123456789012", "INVALID_IFSC", null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                beneficiaryService.addBeneficiary(request)
        );
        assertTrue(ex.getMessage().contains("Invalid IFSC code format"));
    }

    @Test
    void testAddBeneficiary_invalidAccountNumber_throwsIllegalArgument() {
        BeneficiaryRequest request = createRequest("Rahul Sharma", "123", "HDFC0001234", null); // too short

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                beneficiaryService.addBeneficiary(request)
        );
        assertTrue(ex.getMessage().contains("expected 9 to 18 digits"));
    }

    @Test
    void testSimulatePennyDrop_successfulVerification() {
        UUID id = UUID.randomUUID();
        Beneficiary ben = new Beneficiary();
        ben.setId(id);
        ben.setName("Sunita Verma");
        ben.setAccountNumber("987654321000");
        ben.setIfscCode("SBIN0001234");
        ben.setStatus(BeneficiaryStatus.PENDING);

        when(beneficiaryRepository.findById(id)).thenReturn(Optional.of(ben));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(inv -> inv.getArgument(0));

        BeneficiaryResponse res = beneficiaryService.verifyPennyDrop(id);

        assertEquals(BeneficiaryStatus.VERIFIED, res.status());
        assertNotNull(res.verificationDetails());
        assertTrue(res.verificationDetails().contains("SIMULATED Penny-Drop"));
        verify(auditService).record(eq("BENEFICIARY_VERIFIED"), eq("Beneficiary"), eq(id), any(), anyString());
    }

    @Test
    void testSimulatePennyDrop_nameMismatch_rejectsBeneficiary() {
        UUID id = UUID.randomUUID();
        Beneficiary ben = new Beneficiary();
        ben.setId(id);
        // Name "MISMATCH" triggers simulated name mismatch in BeneficiaryService
        ben.setName("MISMATCH");
        ben.setAccountNumber("987654321000");
        ben.setIfscCode("SBIN0001234");
        ben.setStatus(BeneficiaryStatus.PENDING);

        when(beneficiaryRepository.findById(id)).thenReturn(Optional.of(ben));
        when(beneficiaryRepository.save(any(Beneficiary.class))).thenAnswer(inv -> inv.getArgument(0));

        BeneficiaryResponse res = beneficiaryService.verifyPennyDrop(id);

        assertEquals(BeneficiaryStatus.REJECTED, res.status());
        assertNotNull(res.verificationDetails());
        assertTrue(res.verificationDetails().contains("SIMULATED Penny-Drop FAILED"));
        verify(auditService).record(eq("BENEFICIARY_REJECTED"), eq("Beneficiary"), eq(id), any(), anyString());
    }
}
