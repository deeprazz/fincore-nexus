package com.fincore.notification_service.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DeliveryLogRepository extends JpaRepository<DeliveryLog, UUID> {
    List<DeliveryLog> findByNotificationIdOrderByCreatedAtDesc(UUID notificationId);
    List<DeliveryLog> findTop100ByOrderByCreatedAtDesc();
}
