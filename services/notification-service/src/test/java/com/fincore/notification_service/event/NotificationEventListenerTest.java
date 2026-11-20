package com.fincore.notification_service.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.notification_service.notification.NotificationChannel;
import com.fincore.notification_service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationEventListenerTest {

    private NotificationService notificationService;
    private ProcessedEventRepository processedEventRepository;
    private ObjectMapper objectMapper;
    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        notificationService = Mockito.mock(NotificationService.class);
        processedEventRepository = Mockito.mock(ProcessedEventRepository.class);
        objectMapper = new ObjectMapper();
        listener = new NotificationEventListener(notificationService, processedEventRepository, objectMapper);
    }

    @Test
    void testOnPaymentCompleted_sendsNotificationsAndSavesIdempotency() {
        String payload = """
            {
                "eventId": "%s",
                "paymentId": "%s",
                "customerId": "%s",
                "utr": "UTR-12345678",
                "amount": "15000.00",
                "paymentRail": "IMPS",
                "settledAt": "2026-11-20T10:00:00Z"
            }
        """.formatted(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

        when(processedEventRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

        listener.onPaymentCompleted(payload);

        verify(notificationService).sendNotification(any(), eq(NotificationChannel.SMS), anyString(), eq("Payment Successful"), contains("INR 15000.00"), eq("PAYMENT_COMPLETED"));
        verify(notificationService).sendNotification(any(), eq(NotificationChannel.EMAIL), anyString(), contains("UTR-12345678"), contains("INR 15000.00"), eq("PAYMENT_COMPLETED"));
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testOnPaymentCompleted_idempotentSkipWhenAlreadyProcessed() {
        String payload = """
            {
                "utr": "UTR-DUPLICATE",
                "amount": "500.00"
            }
        """;

        when(processedEventRepository.existsByIdempotencyKey(anyString())).thenReturn(true);

        listener.onPaymentCompleted(payload);

        verify(notificationService, never()).sendNotification(any(), any(), anyString(), anyString(), anyString(), anyString());
        verify(processedEventRepository, never()).save(any(ProcessedEvent.class));
    }
}
