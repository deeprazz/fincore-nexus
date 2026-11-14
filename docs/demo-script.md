# FinCore Nexus — 10-Minute Friday Demo Walkthrough

This script provides an exact step-by-step demonstration path showcasing the end-to-end capabilities of FinCore Nexus across all 4 Milestones.

---

## Prerequisites & Setup

Ensure all services are running via Docker Compose or PowerShell:
```powershell
# Bring up infrastructure and services
docker compose up -d

# Or run frontend dev server
cd frontend; npm run dev
```

Open browser to `http://localhost:5173` (or production portal `http://localhost:3000`).
Default credentials:
- **Staff (Teller)**: `teller` / `Teller@123`
- **Branch Manager**: `manager` / `Manager@123`
- **System Admin**: `admin` / `Admin@123`

---

## Step 1: Customer Registration & KYC Onboarding (2 Mins)

1. **Sign in as Teller**: Use credentials `teller` / `Teller@123`.
2. **Register New Customer**:
   - Navigate to `/customers` -> Click **+ New Customer**.
   - Name: `Aditya Verma`
   - Email: `aditya.verma@example.com`
   - Initial KYC Status: `PENDING` (Account opening is locked until verified).
   - Note the generated `Customer UUID`.
3. **Submit KYC Application**:
   - Navigate to `/kyc` -> Click **Onboard Customer**.
   - Input Customer UUID, Legal Name, Date of Birth (`1994-08-20`).
   - PAN: `BNZPA5678K` (Valid regex verified).
   - Aadhaar: `987654321013` (Valid Verhoeff checksum verified).
   - Upload sample PAN card image -> Observe Neural OCR extracting text with **96.5% confidence**.
   - Trigger **Webcam Selfie Capture** -> Observe Blink/Head-turn liveness challenge passing with **94.8% biometric similarity**.
   - Review Risk Assessment: Watchlist Screening indicates **Clean / Low Risk (Score: 0.05)**.
   - Click **Submit KYC Application** -> Record transitions to `PENDING_REVIEW` (Maker: `teller`).

---

## Step 2: Maker-Checker KYC Approval (1.5 Mins)

1. **Attempt Self-Approval as Teller**:
   - Inspect the pending application -> Click **Approve**.
   - Observe error message: `Maker-checker violation: Submitter cannot approve their own application`.
2. **Sign in as Manager**:
   - Log out -> Sign in with `manager` / `Manager@123`.
   - Navigate to `/kyc` -> Open the pending review queue.
   - Inspect decrypted documents at rest (AES-256-GCM), OCR fields, facial match, and clean PEP/sanctions status.
   - Enter remark: *"Documents verified against national registry"*.
   - Click **Approve KYC (Unlock Banking)**.
   - **Kafka Event Fired**: `kyc.approved` is published. Core banking automatically updates customer status to `VERIFIED`. Notification service logs customer SMS/email.

---

## Step 3: Open Account & Deposit Initial Funds (1.5 Mins)

1. **Open Savings Account**:
   - Navigate to `/accounts` -> Click **Open Account**.
   - Select Customer: `Aditya Verma`.
   - Account Type: `SAVINGS`.
   - Initial Balance: `₹50,000.00`.
   - Account successfully created with unique account number (e.g., `FINC100000000045`).
2. **Deposit Additional Liquidity**:
   - Navigate to `/operations` -> Select Deposit.
   - Account: `FINC100000000045`
   - Amount: `₹2,00,000.00`
   - Click **Submit Deposit** -> Balance updates to `₹2,50,000.00`.
   - Transaction is published to `transaction.completed` via transactional outbox.

---

## Step 4: Loan Origination, Scoring & SAGA Disbursement (2.5 Mins)

1. **Apply for Personal Loan**:
   - Navigate to `/loans` -> Click **Apply for Loan**.
   - Customer ID: `Aditya Verma`
   - Amount: `₹5,00,000.00`
   - Annual Income: `₹12,00,000.00`
   - Existing Monthly Obligations: `₹15,000.00`
   - Tenure: `24 Months`
   - Target Account: `FINC100000000045`
2. **Deterministic Credit Assessment**:
   - Observe automatic score calculation: **785 / 900 (Decision: APPROVED)**.
   - Exact `DECIMAL128` monthly EMI computed: `₹23,536.75`.
3. **Approve Loan & Trigger SAGA**:
   - Click **Submit & Authorize Loan**.
   - Observe the **Disbursement SAGA Timeline**:
     - `1. LOAN_APPROVED` (Emitted to Kafka topic `loan.approved`)
     - `2. SAGA_DISBURSE_COMMAND` (Core banking receives command and credits account idempotently)
     - `3. LOAN_DISBURSED` (Core emits confirmation)
     - `4. LOAN_ACTIVE` (Amortisation schedule generated with 24 installments)
   - Navigate to `/accounts` -> Verify account balance increased by `₹5,00,000.00` to `₹7,50,000.00`.

---

## Step 5: Beneficiary Penny-Drop & IMPS Transfer (1.5 Mins)

1. **Add Beneficiary**:
   - Navigate to `/payments` -> Beneficiaries tab.
   - Name: `Vikram Malhotra`
   - Account: `987654321099`
   - IFSC: `HDFC0001234`
   - Click **Save Beneficiary** -> Status: `PENDING`.
2. **Penny-Drop Verification**:
   - Click **Verify via Penny Drop**.
   - Simulated `₹1.00` reverse-clearing cycle executes -> Status updates to `VERIFIED`.
3. **Execute Immediate IMPS Payment**:
   - Switch to **Initiate Payment** tab.
   - Source Account: `FINC100000000045`
   - Rail: `IMPS` (Instant T+0 Gross Settlement)
   - Amount: `₹25,000.00`
   - Purpose: `Vendor Invoice Settlement`
   - Click **Execute Payment**.
   - Observe **Rule Fraud Check**: Velocity OK, Outlier OK -> **Decision: ALLOW (Risk Score: 0.12)**.
   - Payment SAGA completes: Debited -> Credited -> Settled.
   - **Unique Banking UTR Generated**: `IMPS20261114XXXXXXXXXX`.
   - Click **Download Payment Receipt** -> Generates formatted PDF receipt with transaction watermark.

---

## Step 6: PCI-DSS Compliance & Cryptographic Audit Verification (1 Min)

1. **Review Live PCI-DSS Compliance**:
   - Navigate to `/compliance` -> **PCI-DSS Compliance Checklist**.
   - Observe dynamic evaluation showing **100% COMPLIANT** across all 6 technical controls:
     - Sensitive Authentication Data Protection (`PCI-DSS-3.2`) -> PASS
     - Government ID & PAN Masking (`PCI-DSS-3.4`) -> PASS
     - Data Encryption at Rest (`PCI-DSS-3.5`) -> PASS
     - Automated & Immutable Audit Trails (`PCI-DSS-10.2`) -> PASS
     - Dual Control RBAC (`PCI-DSS-7.1`) -> PASS
     - Transport Security & Network Safeguards (`PCI-DSS-4.1`) -> PASS
2. **Recompute SHA-256 Cryptographic Audit Hash Chains**:
   - Switch to **Cryptographic Audit Verification** tab.
   - Click **Recompute Chain Hashes**.
   - System recomputes SHA-256 linked blocks across `fincore` and `fincore_kyc` ledgers.
   - **Result**: `ALL CHAINS VALID` (Zero sequence anomalies; mathematical tamper-proof proof).
3. **Master Telemetry Dashboard**:
   - Navigate to `/master` (Master Telemetry).
   - Observe unified real-time dashboard reflecting the entire lifecycle: active accounts, loan portfolio YTD, 100% payment success rate, measured 84.5 TPS, and 100% PCI-DSS compliance!
