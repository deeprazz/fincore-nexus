# Security Policy — FinCore Nexus

FinCore Nexus is an enterprise digital banking platform engineered following banking-grade security specifications, zero-trust network boundaries, and RBI / PCI-DSS compliance frameworks.

---

## 1. Supported Versions

Security updates, patches, and vulnerability mitigations are actively provided for the following releases:

| Version | Supported | Java Runtime | Spring Boot |
|:---|:---:|:---|:---|
| **1.0.x (Current / Main)** | :white_check_mark: | Java 25 | Spring Boot 4.1.x |
| **0.9.x** | :x: | Java 21 / 25 | Spring Boot 4.0.x |

---

## 2. Reporting a Vulnerability

The FinCore Nexus engineering team treats security issues with paramount urgency. If you discover a potential vulnerability, security oversight, or sensitive data exposure, please disclose it responsibly.

### How to Report:
* **Private Disclosure:** Please do not file public GitHub issues for security vulnerabilities.
* **Email:** Send your encrypted report to `security@fincore-nexus.dev` (or open a confidential GitHub Security Advisory under the repository's **Security $\to$ Advisories** tab).
* **Information to Include:**
  * Detailed description of the vulnerability, including affected microservice (`core-banking-services`, `loan-service`, `payment-service`, `kyc-service`, `api-gateway`, or `frontend`).
  * Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
  * Potential impact assessment on data confidentiality, integrity, or system availability.
  * Your PGP public key if you require encrypted correspondence.

### Response SLA:
* **Initial Acknowledgment:** Within 24 hours.
* **Triage & Severity Assessment:** Within 48 hours.
* **Remediation & Patch Deployment:** Critical severity within 7 business days; High severity within 14 business days.

---

## 3. Core Security & Compliance Safeguards

FinCore Nexus enforces defense-in-depth across the entire application stack:

### A. Identification & Sensitive Customer Data (KYC)
* **Aadhaar Protection:** Full 12-digit Aadhaar numbers are never exposed in unmasked form in API responses or logs. They are validated via the mathematical Verhoeff checksum algorithm and masked as `•••• •••• 1234` with salted cryptographic hashing.
* **PAN Card Data:** Evaluated against the statutory Income Tax format regex (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`) and masked across client interfaces.
* **Encryption at Rest:** Identity verification documents (passports, national IDs, webcam biometrics) are encrypted using **AES-256 in Galois/Counter Mode (GCM)** with a randomized 12-byte IV per artifact before saving to disk.

### B. Access Control & Authorization (RBAC + Maker-Checker)
* **Role-Based Access Control:** Strict role segregation among `TELLER`, `MANAGER`, `ADMIN`, and `CUSTOMER`.
* **Dual Maker-Checker Governance:** 
  * Tellers can initiate customer registrations and submit loan applications.
  * Only Managers or Admins can confirm KYC verifications or approve high-value loan disbursements.
  * Submitter self-approval is programmatically blocked with HTTP `403 Forbidden`.

### C. Financial Ledger & Audit Trail Immutability
* **Double-Entry Ledger:** Balance mutations run inside pessimistic row locks (`PESSIMISTIC_WRITE`) preventing race conditions and double-spending.
* **Cryptographic SHA-256 Hash Chaining:** Every state mutation produces an audit log record cryptographically linked to the previous record (`hash = SHA256(prev_hash + data)`).
* **Database Immutability Trigger:** A PostgreSQL trigger (`trg_audit_log_immutable`) actively blocks any `UPDATE` or `DELETE` statement executed directly against the `audit_log` table.
* **Integrity Verification:** Endpoint `GET /api/compliance/audit/verify` re-computes the entire chain on demand to detect tampering.

### D. Network, Transport & CORS Security
* **CORS Single-Source Governance:** All CORS policies are governed centrally via Spring Security's `CorsConfigurationSource` / API Gateway filter, preventing duplicate `Access-Control-Allow-Origin` response headers.
* **Transport Security:** Strict Transport Security (HSTS) and TLS 1.3 encryption across all public ingress points.
* **Rate Limiting:** Redis-backed token bucket rate limiting (120 req/min per IP/token) enforced at the API Gateway (`api-gateway`).

---

## 4. Security Checklist for Contributors

When submitting pull requests:
1. **Never commit secrets:** Keep all passwords, API keys, and JWT signing keys in `.env` (which is excluded via `.gitignore`).
2. **Prevent SQL Injection:** Use JPA repositories or parameterized JDBC queries. Never concatenate SQL strings.
3. **Prevent XSS:** Ensure all user-supplied data in React is rendered through JSX escaping or DOMPurify.
4. **Audit Dependencies:** Run `mvn dependency-check:check` and `npm audit` prior to issuing releases.
