package com.fincore.kyc_service.ocr;

import java.math.BigDecimal;

public record OcrExtractionResult(
        boolean success,
        BigDecimal confidence,
        String extractedPan,
        String extractedAadhaar,
        String extractedName,
        String extractedDob,
        String rawText,
        String notes
) {}
