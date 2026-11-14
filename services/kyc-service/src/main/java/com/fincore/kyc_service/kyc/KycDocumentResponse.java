package com.fincore.kyc_service.kyc;

import java.time.Instant;
import java.util.UUID;

public record KycDocumentResponse(
        UUID id,
        DocumentType documentType,
        String fileName,
        String contentType,
        long fileSize,
        Instant createdAt
) {}
