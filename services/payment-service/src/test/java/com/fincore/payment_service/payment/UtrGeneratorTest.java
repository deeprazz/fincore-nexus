package com.fincore.payment_service.payment;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UtrGeneratorTest {

    private final UtrGenerator generator = new UtrGenerator();

    @Test
    void generatesValidUtrWithPrefix() {
        String impsUtr = generator.generateUtr(PaymentRail.IMPS);
        assertTrue(impsUtr.startsWith("FINCIMPS"));
        assertTrue(impsUtr.length() >= 24);

        String upiUtr = generator.generateUtr(PaymentRail.UPI);
        assertTrue(upiUtr.startsWith("FINCUPI"));

        String neftUtr = generator.generateUtr(PaymentRail.NEFT);
        assertTrue(neftUtr.startsWith("FINCNEFT"));
    }

    @Test
    void consecutiveUtrsAreUnique() {
        String utr1 = generator.generateUtr(PaymentRail.IMPS);
        String utr2 = generator.generateUtr(PaymentRail.IMPS);
        assertNotEquals(utr1, utr2);
    }
}
