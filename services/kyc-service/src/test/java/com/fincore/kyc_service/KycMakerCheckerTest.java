package com.fincore.kyc_service;

import com.fincore.kyc_service.kyc.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KycMakerCheckerTest {

    @Mock
    private KycApplicationRepository applicationRepository;

    @InjectMocks
    private KycService kycService;

    @Test
    void shouldBlockSelfApprovalWhenMakerEqualsChecker() {
        UUID appId = UUID.randomUUID();
        KycApplication app = new KycApplication();
        app.setId(appId);
        app.setSubmittedBy("teller");
        app.setStatus(KycStatus.PENDING_REVIEW);

        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));

        KycReviewRequest request = new KycReviewRequest("Looks good to me");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                kycService.approve(appId, request, "teller")
        );

        assertTrue(ex.getMessage().contains("Maker-checker violation"));
    }

    @Test
    void shouldBlockSelfRejectionWhenMakerEqualsChecker() {
        UUID appId = UUID.randomUUID();
        KycApplication app = new KycApplication();
        app.setId(appId);
        app.setSubmittedBy("manager_maker");
        app.setStatus(KycStatus.PENDING_REVIEW);

        when(applicationRepository.findById(appId)).thenReturn(Optional.of(app));

        KycReviewRequest request = new KycReviewRequest("Self rejection attempt");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                kycService.reject(appId, request, "manager_maker")
        );

        assertTrue(ex.getMessage().contains("Maker-checker violation"));
    }
}
