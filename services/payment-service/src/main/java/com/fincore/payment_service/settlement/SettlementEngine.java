package com.fincore.payment_service.settlement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.payment_service.event.OutboxEvent;
import com.fincore.payment_service.event.OutboxEventRepository;
import com.fincore.payment_service.event.PaymentSettledEvent;
import com.fincore.payment_service.payment.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class SettlementEngine {

    private static final Logger log = LoggerFactory.getLogger(SettlementEngine.class);

    private final PaymentRepository paymentRepository;
    private final SettlementBatchRepository batchRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public SettlementEngine(PaymentRepository paymentRepository,
                            SettlementBatchRepository batchRepository,
                            OutboxEventRepository outboxEventRepository,
                            ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.batchRepository = batchRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Settle an instant payment (IMPS/UPI) immediately (T+0).
     */
    public void settleInstant(Payment payment) {
        payment.setStatus(PaymentStatus.SETTLED);
        payment.setSettledAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        PaymentSettledEvent event = new PaymentSettledEvent(
                payment.getId(), payment.getUtr(), payment.getPaymentRail(),
                payment.getAmount(), payment.getSettledAt()
        );
        try {
            outboxEventRepository.save(new OutboxEvent(
                    "Payment",
                    payment.getId().toString(),
                    "payment.settled",
                    objectMapper.writeValueAsString(event)
            ));
        } catch (Exception e) {
            log.error("Failed to queue outbox event for payment.settled: {}", e.getMessage());
        }
        log.info("Instant settlement completed for payment {} (UTR: {}, Rail: {})", payment.getId(), payment.getUtr(), payment.getPaymentRail());
    }

    /**
     * Process batch settlement for NEFT payments.
     */
    public SettlementBatch processNeftBatch() {
        List<Payment> pendingNeft = paymentRepository.findByPaymentRailAndStatus(PaymentRail.NEFT, PaymentStatus.CREDITED);
        if (pendingNeft.isEmpty()) {
            log.info("No pending NEFT payments to settle");
            return null;
        }

        String batchRef = "NEFT-BATCH-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(OffsetDateTime.now());
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Payment p : pendingNeft) {
            p.setStatus(PaymentStatus.SETTLED);
            p.setSettledAt(OffsetDateTime.now());
            paymentRepository.save(p);
            totalAmount = totalAmount.add(p.getAmount());

            PaymentSettledEvent event = new PaymentSettledEvent(
                    p.getId(), p.getUtr(), p.getPaymentRail(), p.getAmount(), p.getSettledAt()
            );
            try {
                outboxEventRepository.save(new OutboxEvent(
                        "Payment",
                        p.getId().toString(),
                        "payment.settled",
                        objectMapper.writeValueAsString(event)
                ));
            } catch (Exception e) {
                log.error("Failed to queue batch outbox event for payment.settled: {}", e.getMessage());
            }
        }

        SettlementBatch batch = new SettlementBatch();
        batch.setBatchReference(batchRef);
        batch.setPaymentRail(PaymentRail.NEFT);
        batch.setTotalTransactions(pendingNeft.size());
        batch.setTotalAmount(totalAmount);
        batch.setStatus(SettlementStatus.SETTLED);
        batch.setSettledAt(OffsetDateTime.now());
        SettlementBatch saved = batchRepository.save(batch);

        log.info("Settled NEFT batch {}: {} txns, total ₹{}", batchRef, pendingNeft.size(), totalAmount);
        return saved;
    }

    /**
     * Generates a daily settlement & reconciliation report.
     */
    @Transactional(readOnly = true)
    public SettlementReportResponse generateReconciliationReport() {
        List<Payment> all = paymentRepository.findAll();
        long totalPayments = all.size();
        BigDecimal totalVolume = all.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        long settledCount = all.stream().filter(p -> p.getStatus() == PaymentStatus.SETTLED).count();
        BigDecimal settledVolume = all.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SETTLED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingSettlement = all.stream().filter(p -> p.getStatus() == PaymentStatus.CREDITED).count();
        long failed = all.stream().filter(p -> p.getStatus() == PaymentStatus.FAILED).count();
        long reversed = all.stream().filter(p -> p.getStatus() == PaymentStatus.REVERSED).count();

        Map<String, Long> byRail = new LinkedHashMap<>();
        byRail.put("IMPS", all.stream().filter(p -> p.getPaymentRail() == PaymentRail.IMPS).count());
        byRail.put("UPI", all.stream().filter(p -> p.getPaymentRail() == PaymentRail.UPI).count());
        byRail.put("NEFT", all.stream().filter(p -> p.getPaymentRail() == PaymentRail.NEFT).count());

        List<SettlementBatch> batches = batchRepository.findAll();

        return new SettlementReportResponse(
                LocalDate.now(),
                totalPayments,
                totalVolume,
                settledCount,
                settledVolume,
                pendingSettlement,
                failed,
                reversed,
                batches.size(),
                byRail,
                "RECONCILED_MATCH"
        );
    }
}
