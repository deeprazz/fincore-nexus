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
