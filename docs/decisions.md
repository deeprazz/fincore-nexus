# Architectural & Implementation Decisions

## Phase 0: Stabilise & Refactor
- **Consolidated AccountStatementResponse**: Normalized statement DTOs between core account statements and customer portal statements.
- **PIN Lockout & Transactional Outbox**: Implemented Flyway migration `V10__pin_lockout_and_outbox.sql` with scheduled relay for reliable event delivery.
- **Frontend Modularisation**: Restructured monolithic frontend into clean layers (`api/`, `context/`, `hooks/`, `components/`, `features/`, `utils/`, `styles/`).

## Phase 1: Milestone 1 Completion
- **Redis Cache-Aside**: Redis caching with 60s TTL for account balance inquiries with graceful fallback on cache failure.
- **Cryptographic Audit Chain**: SHA-256 hash chaining with PostgreSQL trigger preventing `UPDATE` and `DELETE` on `audit_log`. Verification API exposed at `/api/audit/verify`.
- **RBAC**: Multi-role security model (TELLER, MANAGER, ADMIN, CUSTOMER) enforced on REST endpoints.
- **Dashboard Real Metrics**: Live calculations from database + Micrometer latency timer for p50/p95 response times.

## Phase 2: Loan Management Service (Milestone 2)
- **Separate Microservice Architecture**: Created `services/loan-service` on port 8082 with dedicated PostgreSQL database `fincore_loan`.
- **Deterministic Credit Assessment**: Implemented scoring algorithm (range 300–900) evaluating income, loan-to-income (LTI) ratio, KYC status, existing obligations, and overdue EMI history.
- **High-Precision EMI Amortisation**: Using `BigDecimal` with `MathContext.DECIMAL128` and residual adjustment on the final installment.
- **Event-Driven Disbursement SAGA (Kafka)**:
  - Loan approval publishes to `loan.approved`.
  - Core banking consumer validates idempotency via `processed_event` table (`V12__create_processed_event.sql`), credits the account, and emits `loan.disbursed`.
  - Loan service listens to `loan.disbursed`, transitions loan status to `ACTIVE`, and generates the EMI schedule.
- **Automated Debit Scheduler & NPA Classification**: Hourly scheduled auto-debit publishing `emi.debit.requested`. Core banking debits account and responds on `emi.debit.result`. Loans are automatically classified across standard regulatory buckets: `STANDARD`, `SMA_0` (1–30 DPD), `SMA_1` (31–60 DPD), `SMA_2` (61–89 DPD), and `NPA` (>= 90 DPD).
- **Frontend Integration**: Added dedicated `/loans` hub with loan applications, EMI calculator, real-time portfolio/NPA metrics, loan details with schedule tables, and collections management.

## Phase 3: Payment Orchestration Service & Notification Service (Milestone 3)
- **Separate Microservice Architecture**:
  - `services/payment-service` running on port 8083 with PostgreSQL database `fincore_payment`.
  - `services/notification-service` running on port 8085 with PostgreSQL database `fincore_notification`.
- **Beneficiary Lifecycle & Penny Drop**:
  - Simulated penny-drop verification (`INR 1.00` verification cycle) validating account name matches prior to activation.
  - Mandatory regulatory 30-minute cooling-off period restricting transfers > ₹50,000 to recently added beneficiaries.
- **Payment Rails & UTR Generation**:
  - Support for `IMPS` (instant, T+0), `UPI` (instant VPA/account routing, T+0), and `NEFT` (hourly batch settlement).
  - Deterministic banking UTR generation adhering to standard format: `<RAIL><YYYYMMDD><10-digit-sequence>`.
- **Rule-Based Fraud Detection Engine**:
  - Evaluates velocity (hourly transaction frequency and cumulative amount), deviation against 30-day historical average, cooling-off beneficiary status, odd-hour window (23:00–05:00), and rapid consecutive failures.
  - Multi-tier classification: `ALLOW` (score < 0.40), `REVIEW` (score 0.40–0.70), and `BLOCK` (score > 0.70). High-risk transactions are rejected or quarantined before account debit.
- **Payment SAGA & Distributed Idempotency**:
  - End-to-end idempotency backed by unique client request keys and `payment_saga` workflow tracking.
  - Multi-step choreography: Account debit -> External clearing/credit -> SAGA completion / Kafka event emission (`payment.completed` / `payment.failed`).
  - Automatic compensatory rollback (initiating sender refund) if credit/outward execution fails.
- **Settlement Engine & Reconciliation**:
  - Instantaneous gross settlement for IMPS and UPI.
  - Scheduled batch settlement for NEFT with configurable batch cut-offs, computing gross/net volume, fee deductions, and reconciliation anomaly tracking.
- **Notification Service Architecture**:
  - Asynchronously subscribes to Kafka topics (`payment.completed`, `payment.failed`, `loan.disbursed`).
  - Stores notifications in `fincore_notification` and dispatches via simulated SMS/Email providers with delivery audit logs.
  - Exposes REST API for customer notifications with read/unread tracking.
- **Frontend Payment Hub & Real-Time Alerts**:
  - Built comprehensive payments suite: transfer form with dynamic rail limits, beneficiary registry with one-click penny drop, interactive SAGA step timeline, live fraud risk badge, payment receipts, settlement batch viewer, and topbar notification bell.
