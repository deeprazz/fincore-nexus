package com.fincore.kyc_service.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PanValidatorTest {

    private PanValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PanValidator();
    }

    @Test
    void shouldAcceptValidPanFormat() {
        assertTrue(validator.validate("ABCDE1234F"));
        assertTrue(validator.validate("BNZPA5678K"));
    }

    @Test
    void shouldRejectInvalidPanFormats() {
        assertFalse(validator.validate("ABCD1234F")); // 9 chars
        assertFalse(validator.validate("ABCDEF1234")); // letters only at end
        assertFalse(validator.validate("12345ABCDE")); // digits first
        assertFalse(validator.validate("ABCDE12345")); // ends in digit instead of letter
        assertFalse(validator.validate("ABCDE1234FF")); // 11 chars
        assertFalse(validator.validate(null));
    }
}
