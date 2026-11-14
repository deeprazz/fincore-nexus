package com.fincore.kyc_service.validation;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class KycMaskingUtil {

    private static final String SALT = "FinCoreNexusKycSalt2026";

    private KycMaskingUtil() {}

    /**
     * Masks PAN: e.g. ABCDE1234F -> ABCXXXX34F
     */
    public static String maskPan(String pan) {
        if (pan == null || pan.length() < 10) return "XXXXXXXXXX";
        String clean = pan.trim().toUpperCase();
        return clean.substring(0, 3) + "XXXX" + clean.substring(7);
    }

    /**
     * Masks Aadhaar: e.g. 123456789012 -> XXXX-XXXX-9012
     */
    public static String maskAadhaar(String aadhaar) {
        if (aadhaar == null) return "XXXX-XXXX-XXXX";
        String clean = aadhaar.replaceAll("\\s+", "").replaceAll("-", "");
        if (clean.length() < 4) return "XXXX-XXXX-XXXX";
        String last4 = clean.substring(clean.length() - 4);
        return "XXXX-XXXX-" + last4;
    }

    public static String extractLast4(String value) {
        if (value == null) return "";
        String clean = value.replaceAll("\\s+", "").replaceAll("-", "");
        if (clean.length() <= 4) return clean;
        return clean.substring(clean.length() - 4);
    }

    public static String hash(String value) {
        if (value == null) return "";
        String clean = value.trim().toUpperCase();
        return sha256(clean + ":" + SALT);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm missing in JVM", e);
        }
    }
}
