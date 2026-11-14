package com.fincore.payment_service.payment;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;

@Component
public class UtrGenerator {
    private static final String ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_PART = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneOffset.UTC);

    public String generateUtr(PaymentRail rail) {
        String timestamp = DATE_PART.format(Instant.now());
        StringBuilder suffix = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            suffix.append(ALPHANUM.charAt(RANDOM.nextInt(ALPHANUM.length())));
        }
        return "FINC" + rail.name() + timestamp + suffix;
    }
}
