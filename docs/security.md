# FinCore Nexus — Security Architecture & PCI-DSS Compliance

FinCore Nexus implements enterprise-grade technical safeguards designed to exceed financial regulatory frameworks, including the Reserve Bank of India (RBI) Cyber Security Framework, Digital Personal Data Protection Act (DPDP), and Payment Card Industry Data Security Standard (PCI-DSS) v4.0.

---

## 1. Role-Based Access Control (RBAC) & Permission Matrix

FinCore Nexus strictly separates duties across four distinct principal roles: `CUSTOMER`, `TELLER`, `MANAGER`, and `ADMIN`. Principals receive least-privilege entitlements:
- `TELLER` receives operational rights only. Tellers cannot approve loans, confirm/reject KYC, unfreeze/close accounts, or inspect audit logs.
- `MANAGER` receives dual-control approval authorities, collections, portfolio analytics, and audit log inspection. Managers cannot perform admin-exclusive cryptographic chain verification or system reconfiguration.
- `ADMIN` receives cryptographic audit verification, compliance oversight, and system management.
- `CUSTOMER` receives self-service portal entitlements and cannot invoke internal staff endpoints.

### Endpoint Permission Matrix

| Functional Area | HTTP Method & URI Path | Customer | Teller | Manager | Admin | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **Customer Portal** | `GET/POST /api/customer-portal/**` | **ALLOW** | DENY (403) | DENY (403) | DENY (403) | Personal banking self-service |
| **Loan Application** | `POST /api/loans/applications` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Origination (subject to maker-checker) |
| **EMI Calculator** | `POST /api/loans/emi/calculate` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public interest schedule simulator |
| **Loan Prepayment** | `POST /api/loans/*/prepay` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Borrower or staff prepayment |
| **View Loans** | `GET /api/loans/**` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Filtered by customer identity or staff |
| **Standard Banking Ops** | `POST /api/accounts/*/deposit, withdraw, transfer` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** | Routine cash desk operations |
| **Customer Onboarding** | `POST/PATCH /api/customers/**` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** | Account registration & updates |
| **Account Freeze** | `POST /api/accounts/*/freeze` | DENY (403) | **ALLOW** | **ALLOW** | **ALLOW** | Immediate risk mitigation |
| **Account Unfreeze** | `POST /api/accounts/*/unfreeze` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Dual-control manager approval |
| **Account Close** | `POST /api/accounts/*/close` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Dual-control manager approval |
| **KYC Verification** | `POST /api/customers/*/kyc`, `/api/kyc/verify` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Maker != Checker dual control |
| **Loan Approval / Reject** | `PATCH /api/loans/applications/*/approve, reject` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Maker != Checker dual control |
| **Payment Approval / Reject** | `POST /api/payments/*/approve, reject` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Maker != Checker dual control (Fraud REVIEW) |
| **Payment Compensation Retry** | `POST /api/payments/*/retry-compensation` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Operational refund recovery |
| **Beneficiary Penny-Drop** | `POST /api/beneficiaries/*/verify` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Simulated ₹1.00 credit check & name match |
| **Portfolio Analytics** | `GET /api/loans/portfolio` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Delinquency & NPA analytics |
| **Collections Hub** | `GET/POST /api/loans/collections/**` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Delinquency outreach & recovery |
| **Audit Log Viewing** | `GET /api/audit/**` | DENY (403) | DENY (403) | **ALLOW** | **ALLOW** | Immutable record inspection |
| **Audit Chain Verify** | `GET /api/audit/verify`, `/api/compliance/audit/verify` | DENY (403) | DENY (403) | DENY (403) | **ALLOW** | Cryptographic SHA-256 verification |

---

## 2. PCI-DSS Technical Controls Matrix

The `/api/compliance/pci-dss` endpoint evaluates these controls directly against active code configurations and live infrastructure settings:

| Control ID | PCI-DSS v4.0 Requirement | FinCore Nexus Technical Implementation | Verification Evidence | Status |
|---|---|---|---|---|
| **PCI-DSS-3.2** | Protect Sensitive Authentication Data (SAD) | Primary account numbers, CVVs, and raw customer passwords/PINs are strictly prohibited from persistence in plaintext. Account transaction PINs and customer passwords are store as salted bcrypt hashes with cost factor 10+. | Verified zero cardholder CVV or raw PIN columns across all Flyway database schemas. | **PASS** |
| **PCI-DSS-3.4** | Render Primary Account & National IDs Unreadable | `KycMaskingUtil` enforces irreversible truncation and masking on government identifiers. Aadhaar is truncated to last 4 digits (`•••• •••• 1234`) and salted SHA-256 hash. PAN is masked in API responses (`ABCXXXX34F`). | Verified masking filter active across all controllers and API responses. | **PASS** |
| **PCI-DSS-3.5** | Protect Stored Sensitive Data (Encryption at Rest) | All identification documents (PAN cards, Aadhaar documents, live selfies) are encrypted prior to disk storage using AES-256 in Galois/Counter Mode (GCM). | Verified AES-256-GCM cipher provider initialized with randomized 12-byte IVs per document. | **PASS** |
| **PCI-DSS-4.1** | Safeguard Data with Strong Cryptography in Transit | Strict Transport Security (HSTS), TLS 1.3 termination, CORS whitelist constraints, and bearer token authorization. CORS headers are governed through a single Spring Security filter to eliminate header duplication. | Verified TLS headers and centralized CORS origin restrictions enforced at API Gateway and Spring Security filter chains. | **PASS** |
| **PCI-DSS-7.1** | Restrict Access by Business Need-to-Know & Dual Control | Role-Based Access Control (`TELLER`, `MANAGER`, `ADMIN`, `CUSTOMER`). Dual Maker-Checker segregation prevents loan and KYC submitters from self-approving. | Spring Security method security active; HTTP 403 returned on submitter self-approval attempt. | **PASS** |
| **PCI-DSS-10.2** | Implement Automated & Immutable Audit Trails | Every state change is chained using SHA-256 hash linking (`hash = SHA256(prev_hash + data)`). A PostgreSQL trigger prevents `UPDATE` or `DELETE` operations on `audit_log`. | PostgreSQL trigger `trg_audit_log_immutable` verified; cryptographic chain verified at `/api/compliance/audit/verify`. | **PASS** |

---

## 2. Customer KYC & Identity Data Governance

The platform features an onboarding verification workflow for national identities:

### A. Aadhaar ID Protection (12-Digit UID)
* **Mathematical Validation:** Implements the **Verhoeff checksum algorithm** (`VerhoeffValidator.java`) to prevent invalid or misspelled numbers before submission.
* **Storage Protection:** Stored as salted SHA-256 hash and masked string (`•••• •••• 1234`).
* **Zero Plaintext Ingress:** Plaintext Aadhaar numbers are never written to unencrypted database tables or application logs.

### B. PAN (Permanent Account Number) Validation
* **Statutory Regex:** Evaluated against `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` (5 uppercase alphabetic characters, 4 numeric digits, 1 alphabetic check character).
* **Display Masking:** Formatted as `ABCXXXX34F` across all teller tables and customer-facing screens.

### C. Mobile Number Verification
* **Standardization:** Validated against 10-digit Indian national telecom format (`^[6-9]\d{9}$`).

---

## 3. Cryptographic Audit Chain Mechanics

The system maintains an append-only, mathematically verifiable audit ledger:

```
[Genesis Block]
hash: 0000000000000000000000000000000000000000000000000000000000000000
       │
       ▼
[Entry #1]
prev_hash: 0000000000000000000000000000000000000000000000000000000000000000
data:      CUSTOMER_REGISTERED | c001 | teller | ...
hash:      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
       │
       ▼
[Entry #2]
prev_hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
data:      ACCOUNT_OPENED | acc01 | teller | ...
hash:      7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

### Database Trigger Immutability (`V11__audit_immutability_and_chain.sql`)
```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
```

Any direct SQL tampering or unauthorized modification attempts trigger an immediate database-level rollback. The endpoint `GET /api/compliance/audit/verify` recomputes the entire chain dynamically and reports any sequence anomaly.

---

## 4. Dual Authorization (Maker-Checker Governance)

FinCore Nexus eliminates insider threat risk through programmatic dual-authorization barriers:

1. **KYC Verification**:
   - A teller or self-registering customer submits identity records (`status = PENDING`).
   - A manager or authorized teller reviews Aadhaar, Phone, and PAN details in the **KYC Hub** or **Customer Directory** and executes **Confirm KYC** (`status = VERIFIED`).
   - Self-approval by the creator is blocked with `403 Forbidden` if submitted under maker-checker enforcement.

2. **Lending & Credit Approval**:
   - Loan origination requires credit assessment score evaluation (score threshold: $\ge 700$ auto-eligible, $600-699$ manual review, $<600$ rejected).
   - High-value disbursements execute through idempotent SAGA event channels.

---

## 5. Encryption at Rest (AES-256-GCM)

All customer identification artifacts (PAN cards, Aadhaar scans, biometric webcam snapshots) are encrypted prior to disk persistence:
- **Algorithm**: `AES/GCM/NoPadding`
- **Key Length**: 256 bits (32 bytes)
- **Authentication Tag Length**: 128 bits
- **Initialization Vector**: 12 bytes randomly generated per file via `java.security.SecureRandom`
- Files stored as `.enc` binaries on disk; decrypted strictly on authorized request stream via `/api/kyc/documents/{id}/download`.

---

## 6. Network Security & CORS Single-Origin Governance

Cross-Origin Resource Sharing (CORS) is governed through a centralized Spring Security `CorsConfigurationSource` bean and API Gateway filter:
* Allowed origins are constrained to trusted client applications (e.g. `http://localhost:5173`).
* Downstream services do not declare duplicate `@CrossOrigin` controller annotations, ensuring browsers receive a single, valid `Access-Control-Allow-Origin` response header.
* API Gateway enforces Redis-backed rate limiting (120 requests/minute per client IP or authorization token).
