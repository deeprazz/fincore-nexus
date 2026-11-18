package com.fincore.notification_service.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository repository;
    private final DeliveryLogRepository deliveryLogRepository;

    public NotificationService(NotificationRepository repository, DeliveryLogRepository deliveryLogRepository) {
        this.repository = repository;
        this.deliveryLogRepository = deliveryLogRepository;
    }

    public Notification sendNotification(UUID customerId, NotificationChannel channel, String recipient,
                                         String subject, String content, String eventType) {
        Notification n = new Notification();
        n.setCustomerId(customerId);
        n.setChannel(channel);
        n.setRecipient(recipient);
        n.setSubject(subject);
        n.setContent(content);
        n.setEventType(eventType);
        n.setStatus("DELIVERED");
        n.setDeliveryProvider("simulated");

        Notification saved = repository.save(n);

        DeliveryLog deliveryLog = new DeliveryLog(
                saved.getId(),
                channel.name(),
                recipient,
                "DELIVERED",
                "simulated",
                "Delivered successfully via simulated gateway provider for event: " + eventType
        );
        deliveryLogRepository.save(deliveryLog);

        log.info("[SIMULATED-PROVIDER] Dispatched {} to {} for event {}: \"{}\"",
                channel, recipient, eventType, content);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(UUID customerId) {
        if (customerId != null) {
            return repository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                    .map(NotificationResponse::from).collect(Collectors.toList());
        }
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(NotificationResponse::from).collect(Collectors.toList());
    }
}
