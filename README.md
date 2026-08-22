# RecoverAI — Autonomous AI Revenue Recovery Platform

Built for **Razorpay Buildathon Track 03: "AI Revenue Recovery — Find revenue that's slipping away and win it back."**

---

## 1. Executive Summary & Core Capabilities

RecoverAI is an autonomous financial intelligence platform that detects at-risk payment failures, diagnoses underlying technical or customer friction root causes using ensemble machine learning, calculates recovery probabilities, executes bounded recovery actions within policy guardrails, and maintains a cryptographically verified audit ledger.

### Key Pillars:
1. **Real-Time Webhook Engine**: High-throughput ingestion of Razorpay payment events with timing-safe HMAC-SHA256 signature verification and idempotency locks.
2. **Predictive ML Intelligence**: 38-feature ensemble model predicting recovery likelihood, revenue at risk, and actionable root cause classification.
3. **Autonomous Agent & Policy Guardrails**: Bounded execution state machine enforcing retry ceilings, transaction amount caps, and human desk escalation.
4. **Zero-Trust Security & Audit Trail**: Comprehensive security headers, token bucket rate limiting, sensitive credential masking, and tamper-evident audit logging.
5. **Interactive Operations Dashboard**: High-contrast, responsive dashboard with role-based access control (ADMIN / ANALYST), live Razorpay webhook simulator, and interactive recovery case workbench.

---

## 2. System Architecture

```
                                  [Razorpay Payment Gateway]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ Webhooks (HMAC-SHA256 Verified)               │ REST API / Links (Test Mode)
                      ▼                                               ▼
         ┌────────────────────────┐                     ┌────────────────────────┐
         │ RazorpayWebhookService │                     │ RazorpayPaymentService │
         └────────────┬───────────┘                     └────────────────────────┘
                      │ Idempotency Check & Payload Hash
                      ▼
         ┌────────────────────────┐
         │   RecoveryAgent Core   │
         └────────────┬───────────┘
                      ├──► [ML Predictor (38 Features)] ───► Diagnostic & Probabilities
                      ├──► [PolicyEngine Guardrails]     ───► Max Cap, Retry Limits, Human Escalation
                      ├──► [RecoveryExecutor (Sandbox)]  ───► Bounded Retries & Smart Links
                      └──► [AuditService Ledger]         ───► Immutable State Transition Log
                      │
                      ▼
         ┌────────────────────────┐
         │ React 18 UI Workbench  │ (Role-Based: ADMIN / ANALYST)
         └────────────────────────┘
```

---

## 3. Razorpay Test-Mode Integration & Setup

### 3.1 Environment Configuration
RecoverAI isolates gateway keys in the backend. Secrets are **never** exposed to the frontend browser.

Configure `.env` in the project root:

```env
# Server Port (Hardcoded to 3000 in sandbox)
PORT=3000

# Razorpay Test-Mode API Credentials
RAZORPAY_KEY_ID=rzp_test_5yL7g9AbCdEf12
RAZORPAY_KEY_SECRET=sEcReT_tEsT_kEy_vAlUe_998877
RAZORPAY_WEBHOOK_SECRET=whsec_recoverai_test_secret_2026_x99

# Simulation & Safety Flags
SIMULATION_MODE=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

### 3.2 Gateway Endpoints Implemented

| Endpoint | Method | Purpose | Security / Requirements |
|---|---|---|---|
| `/api/webhooks/razorpay` | `POST` | Ingests real & test Razorpay webhook events | `x-razorpay-signature` (HMAC SHA-256) |
| `/api/webhooks/razorpay/simulate` | `POST` | Dispatches simulated payment events | Accessible in `SIMULATION_MODE` |
| `/api/webhooks/razorpay/events` | `GET` | Retrieves recent webhook event ledger | Requires JWT Authentication |
| `/api/webhooks/razorpay/config` | `GET` | Webhook verification status & endpoint URL | Requires JWT Authentication |
| `/api/recovery/cases` | `GET` | Lists all active/recovered recovery cases | RBAC (ADMIN / ANALYST) |
| `/api/recovery/cases/:id/execute` | `POST` | Manually triggers or overrides recovery action | RBAC (ADMIN Only) |
| `/api/audit/logs` | `GET` | Immutable timeline of transitions & decisions | RBAC (Read-Only for ANALYST) |

---

## 4. Webhook Security & Ingestion Pipeline

### 4.1 Cryptographic Signature Verification
Razorpay webhooks pass a signature header `x-razorpay-signature`. The backend computes:

$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{Raw Request Body}, \text{RAZORPAY\_WEBHOOK\_SECRET})$$

Verification utilizes `crypto.timingSafeEqual` over pre-allocated byte buffers to prevent timing side-channel attacks.

### 4.2 Idempotency & Deduplication
To guarantee at-most-once processing across network retries:
- Every event is indexed by its gateway `event_id`.
- A deterministic `payload_hash` ($\text{SHA256}(\text{rawBody})$) guards against header variations.
- Duplicate deliveries immediately return HTTP `200 OK` with status `DUPLICATE_SKIPPED` without re-triggering dunning or ML jobs.

### 4.3 Supported Razorpay Event Lifecycle

| Gateway Event | RecoverAI Automated Action |
|---|---|
| `payment.failed` | Analyzes failure reason, computes ML probability, checks policy caps, initiates automated smart recovery or human escalation. |
| `payment.captured` | Verifies recovery amount, marks case as `RECOVERED`, halts all outstanding dunning reminders or retries. |
| `payment_link.paid` | Confirms payment link settlement, closes active recovery ticket, records settled audit log. |
| `order.paid` | Synchronizes order reconciliation state with customer transaction ledger. |

---

## 5. Security Hardening & Guardrails

1. **Security Headers**: Injected on all API responses (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, `Content-Security-Policy`).
2. **Rate Limiting**: Sliding Token Bucket algorithm restricting client IP requests (default 120 req/min).
3. **Data Masking & Redaction**: Customer PII (phone numbers, emails) and secrets are masked in server logs (`j***@example.com`, `+91 98*** **210`).
4. **High-Value Transaction Guardrail**: Any payment exceeding ₹50,000 (configurable) is automatically barred from autonomous debit retries and redirected to `HUMAN_ESCALATION` for human desk approval.
5. **Cooldown Intervals**: Strict 60-second cooldown between consecutive automated retries per case.

---

## 6. How to Test & Verify

### 6.1 Running the Unified Test Suite
The codebase includes comprehensive integration and unit tests covering ML prediction, AI agent workflows, and Razorpay webhook security:

```bash
npm test
```

**Test Suite Coverage (49/49 Passing):**
- `tests/razorpay.test.ts`: HMAC signature verification, forgery rejection, idempotency deduplication, payment failure ingestion, settlement dunning halt, API resilience, ML fallback, and high-value threshold enforcement.
- `tests/agent.test.ts`: State machine transitions, policy engine rule enforcement, bounded execution sandbox, audit logging.
- `tests/ml.test.ts`: 38-feature preprocessing, XGBoost-style ensemble predictions, explainability factor generation, root-cause diagnostics.

### 6.2 Running the Application Locally
```bash
# 1. Install dependencies
npm install

# 2. Seed database & ML models
npm run generate-data
npm run seed

# 3. Start development server (Port 3000)
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

### 6.3 Demo Login Credentials

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **ADMIN** | `admin@recoverai.io` | `Admin@RecoverAI2026` | Full Access: User Management, Recovery Policies, Manual Overrides, System Config |
| **ANALYST** | `analyst@recoverai.io` | `Analyst@RecoverAI2026` | Operations: Cases Workbench, Failed Payments, Interventions, Read-Only Audit & System Health |

*(1-Click demo authentication buttons are available on the Login screen).*

### 6.4 Using the Webhook Simulator in the UI
1. Log in to the application and navigate to **System Health** (`/health`).
2. Scroll to the **Razorpay Webhook Simulator & Diagnostics** panel.
3. Select an event type (`payment.failed`, `payment.captured`, `payment_link.paid`, etc.), adjust the amount and failure reason.
4. Click **Dispatch Test Event** to fire the payload through the real signature verification and recovery pipeline.
5. Watch the live **Webhook Event Ledger** update in real-time with event IDs, payload hashes, and recovery case links.

---

## 7. Production Deployment & Readiness

- **Production Build Command**: `npm run build` compiles Vite assets and bundles the Node.js TypeScript server into `dist/server.cjs`.
- **Production Start Command**: `node dist/server.cjs`.
- **Live Ingress**: Configured to bind on `0.0.0.0:3000`.
