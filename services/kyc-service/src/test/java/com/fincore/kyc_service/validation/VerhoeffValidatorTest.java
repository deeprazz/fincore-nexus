package com.fincore.kyc_service.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VerhoeffValidatorTest {

    private VerhoeffValidator validator;

    @BeforeEach
    void setUp() {
        validator = new VerhoeffValidator();
    }

    @Test
    void shouldValidateValidAadhaarChecksum() {
        // Generate valid 12-digit Aadhaar using Verhoeff algorithm
        String elevenDigits = "98765432101";
        String checkDigit = VerhoeffValidator.generateCheckDigit(elevenDigits);
        String fullAadhaar = elevenDigits + checkDigit;

        assertTrue(validator.validate(fullAadhaar));
    }

    @Test
    void shouldRejectInvalidAadhaarChecksum() {
        // Valid prefix with corrupted check digit
        String elevenDigits = "98765432101";
        String checkDigit = VerhoeffValidator.generateCheckDigit(elevenDigits);
        int wrongDigit = (Integer.parseInt(checkDigit) + 1) % 10;
        String corruptedAadhaar = elevenDigits + wrongDigit;

        assertFalse(validator.validate(corruptedAadhaar));
    }

    @Test
    void shouldRejectInvalidLengthOrFormat() {
        assertFalse(validator.validate("12345")); // too short
        assertFalse(validator.validate("1234567890123")); // too long
        assertFalse(validator.validate("12345678901A")); // non-digits
        assertFalse(validator.validate(null));
    }
}
