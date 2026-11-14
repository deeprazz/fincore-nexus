package com.fincore.kyc_service.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class CryptoServiceTest {

    private CryptoService cryptoService;

    @BeforeEach
    void setUp() {
        cryptoService = new CryptoService("Test256BitSecretKeyForFinCoreKyc!");
    }

    @Test
    void shouldEncryptAndDecryptSuccessfullyWithAesGcm() {
        String originalText = "Confidential Aadhaar / PAN Government Identity Document Payload";
        byte[] plaintext = originalText.getBytes(StandardCharsets.UTF_8);

        CryptoService.EncryptedResult result = cryptoService.encrypt(plaintext);

        assertNotNull(result.cipherBytes());
        assertNotNull(result.ivBase64());
        assertNotEquals(originalText, new String(result.cipherBytes()));

        byte[] decryptedBytes = cryptoService.decrypt(result.cipherBytes(), result.ivBase64());
        String decryptedText = new String(decryptedBytes, StandardCharsets.UTF_8);

        assertEquals(originalText, decryptedText);
    }
}
