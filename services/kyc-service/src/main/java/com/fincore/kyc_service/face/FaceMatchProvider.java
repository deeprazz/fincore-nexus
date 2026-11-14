package com.fincore.kyc_service.face;

public interface FaceMatchProvider {
    FaceMatchResult compareFaces(byte[] idPhoto, byte[] selfiePhoto);
}
