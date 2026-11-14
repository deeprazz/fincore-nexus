# FinCore Nexus — Security Architecture & PCI-DSS Compliance

FinCore Nexus implements enterprise-grade technical safeguards designed to exceed financial regulatory frameworks, including the Reserve Bank of India (RBI) Cyber Security Framework and Payment Card Industry Data Security Standard (PCI-DSS) v4.0.

---

## 1. PCI-DSS Technical Controls Matrix

The `/api/compliance/pci-dss` endpoint evaluates these controls directly against active code configurations and live infrastructure settings:

| Control ID | PCI-DSS v4.0 Requirement | FinCore Nexus Technical Implementation | Verification Evidence | Status |
|---|---|---|---|---|
| **PCI-DSS-3.2** | Protect Sensitive Authentication Data (SAD) | Primary account numbers (PAN), CVVs, and raw PINs are strictly prohibited from persistence. Account transaction PINs are stored as salted bcrypt hashes. | Verified zero cardholder CVV or raw PIN columns across all Flyway database schemas. | **PASS** |
| **PCI-DSS-3.4** | Render Primary Account & National IDs Unreadable | `KycMaskingUtil` enforces irreversible truncation on government identifiers. Aadhaar is truncated to last 4 digits (`XXXX-XXXX-1234`) and salted SHA-256 hash. PAN is masked in responses (`ABCXXXX34F`). | Verified masking filter active across all controllers and API responses. | **PASS** |
| **PCI-DSS-3.5** | Protect Stored Sensitive Data (Encryption at Rest) | All identification documents (PAN cards, Aadhaar documents, live selfies) are encrypted prior to disk storage using AES-256 in Galois/Counter Mode (GCM). | Verified AES-256-GCM cipher provider initialized with randomized 12-byte IVs per document. | **PASS** |
| **PCI-DSS-10.2** | Implement Automated & Immutable Audit Trails | Every state change is chained using SHA-256 hash linking (`hash = SHA256(prev_hash + data)`). A PostgreSQL trigger prevents `UPDATE` or `DELETE` operations on `audit_log`. | PostgreSQL trigger `trg_audit_log_immutable` verified; cryptographic chain verified at `/api/audit/verify`. | **PASS** |
| **PCI-DSS-7.1** | Restrict Access by Business Need-to-Know & Dual Control | Role-Based Access Control (`TELLER`, `MANAGER`, `ADMIN`, `CUSTOMER`). Maker-checker segregation prevents loan and KYC submitters from self-approving. | Spring Security method security active; HTTP 403 returned on submitter self-approval attempt. | **PASS** |
| **PCI-DSS-4.1** | Safeguard Data with Strong Cryptography in Transit | Strict Transport Security (HSTS), TLS 1.3 termination, CORS whitelist constraints, and bearer token authorization. | Verified TLS headers and CORS origin restrictions enforced at API Gateway. | **PASS** |

---

## 2. Cryptographic Audit Chain Mechanics

The system maintains an append-only, mathematically verifiable ledger:

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

### Database Trigger Immutability (`V11__audit_immutability.sql`)
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

## 3. Dual Authorization (Maker-Checker Governance)

FinCore Nexus eliminates insider threat risk through programmatic dual-authorization barriers:

1. **KYC Onboarding**:
   - A teller submits the applicant identity and biometric records (`submittedBy = teller`).
   - Only a manager or admin can approve the application (`reviewedBy = manager`).
   - Attempting self-approval returns `403 Forbidden`: *"Maker-checker violation: Submitter cannot approve their own application"*.

2. **Credit & Lending**:
   - Loan origination requires separate review and authorization by credit managers.
   - High-value disbursements execute through idempotent SAGA event channels.

---

## 4. Encryption at Rest (AES-256-GCM)

All customer identification artifacts (PAN cards, Aadhaar scans, biometric webcam snapshots) are encrypted prior to being written to storage:
- **Algorithm**: `AES/GCM/NoPadding`
- **Key Length**: 256 bits (32 bytes)
- **Authentication Tag Length**: 128 bits
- **Initialization Vector**: 12 bytes randomly generated per file via `java.security.SecureRandom`
- Files stored as `.enc` binaries on disk; decrypted strictly on authorized request stream via `/api/kyc/documents/{id}/download`.
