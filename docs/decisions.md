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

## Phase 4: KYC & Compliance Service (Milestone 4)
- **Separate Microservice Architecture**:
  - Created `services/kyc-service` running on port 8084 with dedicated PostgreSQL database `fincore_kyc`.
- **Identity Verification & Privacy Protection**:
  - Implemented 12-digit Indian Aadhaar validation using the mathematical Verhoeff checksum algorithm (`d`, `p`, `inv` permutation tables).
  - Implemented 10-character PAN validation matching `[A-Z]{5}[0-9]{4}[A-Z]`.
  - Privacy safeguards: Raw Aadhaar numbers are never stored in the database. Storage retains only the last 4 digits (`XXXX-XXXX-1234`) alongside a salted SHA-256 hash. PAN is masked in all API responses and application logs (`ABCXXXX34F`).
- **Data Encryption at Rest (AES-256-GCM)**:
  - Identification documents (PAN cards, Aadhaar images, selfie captures) are encrypted before writing to disk using AES-256 in Galois/Counter Mode (GCM) with randomized 12-byte initialization vectors (IV) per document.
- **Biometric & OCR Pipeline**:
  - Neural text layer parser fallback extracting PAN, Aadhaar, DOB, and Name with confidence scoring (96.5%).
  - Biometric facial recognition landmark engine comparing ID photo against live selfie (similarity score: 94.8%, threshold: 80%).
  - Optical anti-spoof liveness challenge supporting micro-blink and 3D head rotation challenges.
- **PEP & Sanctions Risk Assessment**:
  - Watchlist screening engine evaluating applicants against Politically Exposed Persons (PEP) and global sanctions registries using Levenshtein distance string matching (distance <= 2 or similarity >= 85%).
  - Comprehensive risk scoring engine categorizing profiles into `LOW`, `MEDIUM`, or `HIGH`.
- **Dual Maker-Checker Governance**:
  - Strict segregation of duties: Tellers initiate and onboard applications (`submittedBy`); Managers or Administrators review and authorize (`reviewedBy`).
  - Automated guard blocking self-approval: Any attempt by the submitter to approve their own KYC application raises HTTP 403 Forbidden.
- **Event-Driven Core Banking Integration**:
  - Upon approval, KYC service emits `kyc.approved` to Kafka; upon rejection, emits `kyc.rejected`.
  - Core banking service's `KycEventConsumer` idempotently consumes these events via `processed_event` and transitions customer `kycStatus` to `VERIFIED` (unlocking deposit/account opening) or `REJECTED`.
  - Notification service listens to these events to dispatch customer SMS and email alerts.
- **Dynamic PCI-DSS Compliance Self-Assessment**:
  - Evaluates live technical controls dynamically inspected from database schema, encryption cipher status, masking filters, PostgreSQL trigger immutability, and Spring Security RBAC rules.
  - Controls evaluated: Sensitive Authentication Data Protection (`PCI-DSS-3.2`), ID Masking (`PCI-DSS-3.4`), AES Encryption at Rest (`PCI-DSS-3.5`), Audit Trail Immutability (`PCI-DSS-10.2`), Dual Control RBAC (`PCI-DSS-7.1`), and Network Security (`PCI-DSS-4.1`).
- **Cross-Service Cryptographic Audit Verification**:
  - Endpoint `GET /api/compliance/audit/verify` verifies the SHA-256 cryptographic chain of `fincore_kyc` audit logs and federates verification with core banking's `/api/audit/verify`.
- **Frontend KYC & Compliance Suite**:
  - Built `features/kyc/` (`KycWizard`, `WebcamCapture`, `DocumentUpload`, `OcrResultPanel`, `FaceMatchPanel`, `RiskPanel`, `KycReviewQueue`, `KycDetailModal`, `KycPage`) and `features/compliance/` (`ComplianceChecklist`, `AuditIntegrityPanel`, `CompliancePage`).
