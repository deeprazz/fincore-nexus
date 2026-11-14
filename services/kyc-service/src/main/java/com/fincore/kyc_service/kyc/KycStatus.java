package com.fincore.kyc_service.kyc;

public enum KycStatus {
    SUBMITTED,
    OCR_DONE,
    FACE_MATCHED,
    RISK_SCORED,
    PENDING_REVIEW,
    APPROVED,
    REJECTED
}
