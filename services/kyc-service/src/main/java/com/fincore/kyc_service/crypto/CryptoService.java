package com.fincore.kyc_service.crypto;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

@Service
public class CryptoService {

    public static final String DEFAULT_DEV_KEY = "FinCoreNexusKycSecretKey256BitSecure";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public CryptoService() {
        this(DEFAULT_DEV_KEY, null);
    }

    public CryptoService(String rawKey) {
        this(rawKey, null);
    }

    @Autowired
    public CryptoService(
            @Value("${kyc.encryption.secret-key:" + DEFAULT_DEV_KEY + "}") String rawKey,
            Environment env) {

        if (env != null) {
            List<String> activeProfiles = Arrays.asList(env.getActiveProfiles());
            boolean isNonDevProfile = activeProfiles.contains("prod") || activeProfiles.contains("production");

            if (isNonDevProfile && DEFAULT_DEV_KEY.equals(rawKey)) {
                throw new IllegalStateException(
                        "FATAL SECURITY VIOLATION: KYC Service cannot start in a non-dev / production profile " +
                        "using the default development AES key. Provide a secure key via the KYC_AES_SECRET_KEY environment variable."
                );
            }
        }

        byte[] keyBytes = rawKey.getBytes(StandardCharsets.UTF_8);
        byte[] key256 = new byte[32];
        System.arraycopy(keyBytes, 0, key256, 0, Math.min(keyBytes.length, 32));
        this.secretKey = new SecretKeySpec(key256, "AES");
    }

    public record EncryptedResult(byte[] cipherBytes, String ivBase64) {}

    public EncryptedResult encrypt(byte[] plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] cipherBytes = cipher.doFinal(plaintext);
            String ivBase64 = Base64.getEncoder().encodeToString(iv);
            return new EncryptedResult(cipherBytes, ivBase64);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt data with AES-GCM", e);
        }
    }

    public byte[] decrypt(byte[] ciphertext, String ivBase64) {
        try {
            byte[] iv = Base64.getDecoder().decode(ivBase64);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            return cipher.doFinal(ciphertext);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt data with AES-GCM", e);
        }
    }
}
