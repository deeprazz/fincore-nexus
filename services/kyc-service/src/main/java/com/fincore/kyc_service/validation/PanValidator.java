package com.fincore.kyc_service.validation;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class PanValidator {

    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]$");

    public boolean validate(String pan) {
        if (pan == null) return false;
        String clean = pan.trim().toUpperCase();
        return PAN_PATTERN.matcher(clean).matches();
    }
}
