package com.fincore.kyc_service.ocr;

public interface OcrProvider {
    OcrExtractionResult process(byte[] fileBytes, String documentType, String expectedName, String expectedPan);
}
