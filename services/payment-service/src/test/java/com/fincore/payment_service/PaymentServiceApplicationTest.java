package com.fincore.payment_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class PaymentServiceApplicationTest {

    @Test
    void contextLoads() {
        // Validates that Spring context, JPA repositories, and Kafka config load properly
    }
}
