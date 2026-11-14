package com.fincore.notification_service.notification;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> listAll(
            @RequestParam(required = false) UUID customerId) {
        return ResponseEntity.ok(notificationService.getNotifications(customerId));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<NotificationResponse>> listForCustomer(
            @PathVariable UUID customerId) {
        return ResponseEntity.ok(notificationService.getNotifications(customerId));
    }
}
