package com.fincore.notification_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class NotificationServiceApplicationTest {

    @Test
    void contextLoads() {
        // Validates notification-service Spring context, JPA, and Kafka listeners
    }
}
