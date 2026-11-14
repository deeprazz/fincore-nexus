package com.fincore.kyc_service.face;

public interface LivenessProvider {
    LivenessResult verifyLiveness(byte[] selfieBytes, String challengeType);
}
