# FinCore Nexus — Enterprise Architecture & System Design

FinCore Nexus is an enterprise-grade digital banking and payment platform architected according to strict Domain-Driven Design (DDD), microservice boundary separation, and event-driven choreography.

---

## 1. The 9 Enterprise Architecture Layers

| Layer | Architecture Layer | FinCore Nexus Implementation & Directory | Primary Responsibilities |
|---|---|---|---|
| **1** | **Edge & Gateway Layer** | `services/api-gateway/`, `frontend/nginx.conf` | Reverse proxy routing, SSL termination, Redis rate limiting (120 req/min), CORS headers |
| **2** | **Identity & Access Management (IAM)** | `infra/keycloak/`, Spring Security RBAC | Dual Maker-Checker authorization, JWT validation, HTTP Basic fallback |
| **3** | **Core Banking & Ledger Layer** | `services/core-banking-services/` | Double-entry ledger, accounts, balance cache-aside, immutable SHA-256 audit trail |
| **4** | **Lending & Credit Amortisation Layer** | `services/loan-service/` | Deterministic scoring engine, `DECIMAL128` EMI amortisation, disbursement SAGA |
| **5** | **Payment Orchestration & Clearing Layer**| `services/payment-service/` | IMPS/UPI/NEFT rails, rule fraud engine, payment SAGA, T+0 & batch settlement |
| **6** | **KYC & Regulatory Compliance Layer** | `services/kyc-service/` | Verhoeff Aadhaar, PAN validation, AES-256-GCM encryption at rest, PCI-DSS evaluation |
| **7** | **Messaging & Event Streaming Mesh** | `fincore-kafka:9092`, `docs/events.md` | Distributed Kafka event topics, transactional outbox relay, idempotent consumers |
| **8** | **Data Persistence & Cache Layer** | PostgreSQL 17 (`fincore_*`), Redis 7 | Dedicated schemas per microservice, 60s balance cache, hash-chained ledgers |
| **9** | **Presentation & User Experience Layer** | `frontend/src/` (React 19 + Tailwind CSS) | Unified Master Dashboard, staff workstations, and self-service customer portal |

---

## 2. Microservice Topology

```mermaid
flowchart TB
    Client["Browser / Client App"] -->|HTTPS :80 / :5173| Frontend["React Frontend (Nginx)"]
    Client -->|HTTPS :8080| Gateway["API Gateway (:8080)"]
    Frontend -->|Proxy /api| Gateway

    subgraph Security & Cache
        Keycloak["Keycloak IAM (:8089)"]
        Redis[("Redis 7 (:6379)\nBalance Cache & Rate Limiting")]
    end

    Gateway -->|Rate Limit Check| Redis
    Gateway -->|/api/accounts, /api/customers| Core["Core Banking (:8081)"]
    Gateway -->|/api/loans| Loan["Loan Service (:8082)"]
    Gateway -->|/api/payments| Payment["Payment Service (:8083)"]
    Gateway -->|/api/kyc, /api/compliance| KYC["KYC Service (:8084)"]
    Gateway -->|/api/notifications| Notification["Notification Service (:8085)"]

    subgraph Kafka Event Mesh
        Kafka{{"Apache Kafka 4.0 (:9092)\nTopics: loan.*, payment.*, kyc.*"}}
    end

    Core <-->|Kafka Events| Kafka
    Loan <-->|Kafka Events| Kafka
    Payment <-->|Kafka Events| Kafka
    KYC <-->|Kafka Events| Kafka
    Notification <--|Kafka Events| Kafka

    subgraph Database Isolation
        DBCore[("fincore")]
        DBLoan[("fincore_loan")]
        DBPay[("fincore_payment")]
        DBKyc[("fincore_kyc")]
        DBNotif[("fincore_notification")]
    end

    Core --- DBCore
    Loan --- DBLoan
    Payment --- DBPay
    KYC --- DBKyc
    Notification --- DBNotif
```

---

## 3. Entity Relationship (ER) Diagrams

### Core Banking Database (`fincore`)
```mermaid
erDiagram
    CUSTOMER ||--o{ ACCOUNT : owns
    CUSTOMER ||--o{ AUDIT_LOG : tracks
    ACCOUNT ||--o{ BANKING_TRANSACTION : contains
    ACCOUNT ||--o{ OUTBOX_EVENT : publishes

    CUSTOMER {
        uuid id PK
        string full_name
        string email
        string kyc_status
        timestamp created_at
    }

    ACCOUNT {
        uuid id PK
        uuid customer_id FK
        string account_number UK
        string account_type
        numeric balance
        string status
    }

    BANKING_TRANSACTION {
        uuid id PK
        uuid account_id FK
        numeric amount
        string operation_type
        numeric running_balance
        timestamp created_at
    }

    AUDIT_LOG {
        bigserial id PK
        string event_type
        string entity_id
        string performed_by
        string prev_hash
        string hash
        timestamp created_at
    }
```

### Loan Management Database (`fincore_loan`)
```mermaid
erDiagram
    LOAN_APPLICATION ||--o| LOAN : originates
    LOAN ||--o{ EMI_SCHEDULE : schedules
    LOAN ||--o{ SAGA_INSTANCE : orchestrates

    LOAN_APPLICATION {
        uuid id PK
        uuid customer_id
        numeric requested_amount
        int tenure_months
        string status
        int credit_score
    }

    LOAN {
        uuid id PK
        uuid application_id FK
        uuid target_account_id
        numeric principal_amount
        numeric annual_interest_rate
        numeric monthly_emi
        string status
        string npa_classification
    }

    EMI_SCHEDULE {
        uuid id PK
        uuid loan_id FK
        int installment_number
        date due_date
        numeric emi_amount
        numeric principal_component
        numeric interest_component
        numeric outstanding_balance
        string status
    }
```

### Payment Orchestration Database (`fincore_payment`)
```mermaid
erDiagram
    BENEFICIARY ||--o{ PAYMENT : receives
    PAYMENT ||--o| PAYMENT_SAGA : tracks
    PAYMENT }o--o| SETTLEMENT_BATCH : grouped_into

    BENEFICIARY {
        uuid id PK
        uuid customer_id
        string beneficiary_name
        string account_number
        string ifsc_code
        string status
        timestamp verified_at
        timestamp cooling_off_until
    }

    PAYMENT {
        uuid id PK
        string utr UK
        uuid source_account_id
        string target_account_number
        numeric amount
        string payment_rail
        string fraud_decision
        numeric fraud_score
        string status
    }

    PAYMENT_SAGA {
        uuid id PK
        uuid payment_id FK
        string current_step
        string status
        timestamp started_at
    }

    SETTLEMENT_BATCH {
        uuid id PK
        string batch_reference UK
        string rail
        numeric gross_amount
        int transaction_count
        string status
    }
```

---

## 4. SAGA Sequence Choreography

### Event-Driven Loan Disbursement SAGA
```mermaid
sequenceDiagram
    autonumber
    actor Manager as Branch Manager
    participant Loan as Loan Service (:8082)
    participant Kafka as Apache Kafka (:9092)
    participant Core as Core Banking (:8081)
    participant Notif as Notification Service (:8085)

    Manager->>Loan: POST /api/loans/applications/{id}/approve
    Loan->>Loan: Status -> APPROVED
    Loan->>Kafka: Publish loan.approved (loanId, amount, targetAccountId)
    Kafka->>Core: Consume loan.approved
    Core->>Core: Validate idempotency in processed_event
    Core->>Core: Execute Deposit into target account
    Core->>Kafka: Publish loan.disbursed (loanId, amount, status: SUCCESS)
    Kafka->>Loan: Consume loan.disbursed
    Loan->>Loan: Status -> ACTIVE
    Loan->>Loan: Generate full EMI Amortisation Schedule
    Kafka->>Notif: Consume loan.disbursed
    Notif->>Notif: Log simulated SMS/Email to customer
```

### Payment Clearing & Settlement SAGA
```mermaid
sequenceDiagram
    autonumber
    actor Teller as Teller / Customer
    participant Pay as Payment Service (:8083)
    participant Core as Core Banking (:8081)
    participant Kafka as Apache Kafka (:9092)
    participant Notif as Notification Service (:8085)

    Teller->>Pay: POST /api/payments (Idempotency-Key)
    Pay->>Pay: Check Beneficiary Cooling-Off
    Pay->>Pay: Evaluate Fraud Rules (Velocity, Outlier, Watchlist)
    alt Fraud Score > 0.70
        Pay-->>Teller: 400 Bad Request (FRAUD_BLOCKED)
    else Fraud Score <= 0.70 (ALLOW)
        Pay->>Core: Debit Sender Account
        alt Debit Success
            Pay->>Pay: Credit Beneficiary (Instant IMPS/UPI or Batch NEFT)
            Pay->>Kafka: Publish payment.completed
            Kafka->>Notif: Consume payment.completed -> Send Receipt
            Pay-->>Teller: 200 OK (UTR generated, Status: SETTLED)
        else Debit Failed (Insufficient Funds)
            Pay->>Pay: Status -> FAILED
            Pay->>Kafka: Publish payment.failed
            Pay-->>Teller: 400 Bad Request (DEBIT_FAILED)
        end
    end
```
