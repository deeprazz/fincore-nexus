package com.fincore.loan_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class LoanServiceApplicationTest {

    @Test
    void contextLoads() {
        // Verifies Spring context starts correctly with test profile
    }
}
