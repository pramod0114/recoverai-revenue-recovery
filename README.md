# RecoverAI — Autonomous AI Revenue Recovery Platform

Built for **Razorpay Buildathon Track 03: "AI Revenue Recovery — Find revenue that's slipping away and win it back."**

---

## 1. Executive Summary & Overview

**RecoverAI** is an end-to-end autonomous revenue recovery platform designed to detect failed payment transactions, diagnose underlying technical, banking, and customer friction root causes, execute bounded recovery workflows within strict guardrails, and generate executive financial reports.

RecoverAI pairs a **38-feature Machine Learning prediction model** and an **Autonomous Agent State Machine** with direct **Razorpay Gateway & Webhook integration** to capture lost revenue in real time.

---

## 2. Complete Feature Matrix

### 🚀 Core Platform Features

#### 1. Real-Time Razorpay Ingestion & Webhook Engine
- **HMAC-SHA256 Cryptographic Verification**: Timing-safe verification (`crypto.timingSafeEqual`) on all incoming webhook payloads using `RAZORPAY_WEBHOOK_SECRET`.
- **Idempotency & Deduplication**: Ingests events by `event_id` and SHA-256 payload hash to prevent double dunning or duplicated retries across network re-transmissions.
- **Full Event Lifecycle Support**: Handles `payment.failed`, `payment.captured`, `payment_link.paid`, `order.paid`, and `refund.processed`.
- **Interactive Webhook Simulator**: Built-in simulator to test synthetic payment events directly from the UI with real signature calculation and live ledger tracking.

#### 2. Machine Learning Predictive Intelligence
- **38-Feature Preprocessing Pipeline**: Evaluates transaction velocity, gateway error taxonomy, customer tier, historical payment health score, time-of-day dynamics, bank downtime history, and payment method behavior.
- **Recovery Likelihood Probability**: Quantifies win-back probability ($0.00$ to $1.00$) for every failed payment attempt.
- **Automated Root Cause Diagnostics**: Classifies errors into technical outages (e.g., UPI timeouts, gateway 5xx), customer friction (e.g., card expiry, insufficient funds), or security flags (e.g., 3DS failure).
- **Explainability Factors**: Delivers explainable ML confidence scores and reasoning factors to analysts.

#### 3. Bounded Recovery Agent & Policy Guardrails
- **Autonomous Multi-Channel Execution**:
  - **Smart API Retries**: Exponential backoff scheduling timed with bank clearing windows.
  - **WhatsApp Interactive Links**: Automated rich checkout links with customized win-back messaging.
  - **Automated SMS & Email**: Direct fallback links for mobile customer recovery.
- **Bounded State Machine**: Strict state lifecycle (`DETECTED` ➔ `ANALYZED` ➔ `DISPATCHED` ➔ `RECOVERED` / `FAILED` / `HUMAN_ESCALATION`).
- **Policy Engine Rules**:
  - Max retry ceilings per payment method.
  - Cooldown periods between attempts.
  - Discount caps (configurable per tier).
  - High-value transaction escalation threshold (>₹50,000 auto-routed to human analysts).

#### 4. Designed Excel & Multi-Format Reporting Engine
- **Designed Microsoft Excel Export (`.xls`)**:
  - Custom branded header banner with company metadata and export timestamps.
  - Executive KPI summary cards with styled background fills and metric callouts.
  - Color-coded status badges (🟢 *Success/Recovered*, 🔴 *Failed*, 🔵 *In-Progress*, 🟠 *Scheduled*).
  - High-contrast navy table headers (`#2563EB`) and alternating row striping (`#F9FAFB`).
  - Full Unicode / UTF-8 BOM encoding for INR currency (`₹`) symbols.
- **Standard CSV Export (`.csv`)**: Raw tabular format with UTF-8 BOM encoding for Google Sheets, Numbers, or Excel.
- **JSON Telemetry Export (`.json`)**: Formatted data tree containing raw ML inference parameters, audit trails, and timestamps.
- **Executive PDF / Print View**: Formatted executive report with badges, KPI cards, and printable layout.

#### 5. Operations Workbench & Analytics Dashboards
- **Revenue Recovery Intelligence Dashboard**: Live KPI metrics (Total Recovered, Recovery Rate %, At-Risk Failed Volume, Active Interventions), recovery trend charts, and interactive funnel visualizations.
- **Revenue Analytics Page**: Method win-back yield (UPI, Cards, Netbanking, Wallets), customer tier segmentation (Enterprise, Growth, Standard, Starter), and time-range filtering (`7d`, `30d`, `90d`, `YTD`).
- **Payments Ledger**: Searchable, filterable ledger of payment attempts, failure error codes, gateway telemetries, and AI diagnostic modals.
- **Recovery Cases Workbench**: State machine cases, root cause badges, manual intervention triggers, and recovery timeline modals.
- **Active Interventions Page**: Tracking dispatched WhatsApp messages, SMS, and scheduled retries.
- **Customer Portfolios & Health Scores**: Risk scoring, customer tiers, lifetime spend, and payment failure history.
- **AI Autonomous Agent Live Stream**: Real-time terminal feed of agent inferences, policy checks, and confidence evaluations.
- **Compliance & Audit Ledger**: Tamper-evident ledger recording every system action, user override, and policy transition.
- **Admin Configuration & Recovery Policies**: Configurable retry limits, cooldown hours, discount policies, and user management with RBAC.

#### 6. Zero-Trust Security & Access Control
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN` (full control, manual action execution, policy editing) and `ANALYST` (operations workbench, read-only analytics).
- **JWT Authentication & Password Hashing**: Secure token-based session handling with Bcrypt password hashing.
- **Rate Limiting & Security Headers**: Token bucket IP rate limiting, `nosniff`, `SAMEORIGIN`, and CSP headers.
- **Sensitive Data Masking**: Automatic masking of customer PII in logs and telemetries.

---

## 3. System Architecture

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
                      ├──► [AuditService Ledger]         ───► Immutable State Transition Log
                      └──► [Excel/CSV Export Engine]     ───► Designed .xls, .csv, .json, PDF
                      │
                      ▼
         ┌────────────────────────┐
         │ React 18 UI Workbench  │ (Role-Based: ADMIN / ANALYST)
         └────────────────────────┘
```

---

## 4. Environment Configuration

The backend isolates all API keys and secrets. Secrets are **never** exposed to the frontend client.

Example `.env` configuration:

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
JWT_SECRET=recoverai_jwt_super_secret_key_2026
```

---

## 5. API Endpoints Reference

| Endpoint | Method | Purpose | Access Control |
|---|---|---|---|
| `/api/webhooks/razorpay` | `POST` | Ingests real Razorpay webhook events | `x-razorpay-signature` |
| `/api/webhooks/razorpay/simulate` | `POST` | Dispatches simulated payment events | Public / Simulation |
| `/api/webhooks/razorpay/events` | `GET` | Retrieves recent webhook event ledger | JWT Required |
| `/api/webhooks/razorpay/config` | `GET` | Webhook verification status & endpoint URL | JWT Required |
| `/api/dashboard/overview` | `GET` | Aggregated recovery KPIs and trends | JWT Required |
| `/api/payments` | `GET` | Filtered list of payment transactions | JWT Required |
| `/api/recovery/cases` | `GET` | Lists all active and recovered recovery cases | JWT Required |
| `/api/recovery/cases/:id/execute`| `POST` | Manually triggers recovery intervention | `ADMIN` Role Only |
| `/api/interventions` | `GET` | Lists all dispatched multi-channel actions | JWT Required |
| `/api/customers` | `GET` | Customer profiles, risk scores, and lifetime value | JWT Required |
| `/api/audit/logs` | `GET` | Immutable compliance timeline of decisions | JWT Required |
| `/api/admin/policies` | `GET`/`POST`| List or create recovery policy guardrails | `ADMIN` Role Only |
| `/api/admin/users` | `GET`/`POST`| User management and role assignment | `ADMIN` Role Only |
| `/api/health` | `GET` | System and database health telemetry | Public |

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

### 6.4 Exporting Reports in Designed Excel & CSV
1. Navigate to **Executive & Operational Reports** (`/reports`) or **Revenue Analytics** (`/analytics`).
2. Select **Designed Excel (.xls)**, **CSV (.csv)**, **JSON (.json)**, or **Print / PDF**.
3. Click **Export Report** to immediately download the styled spreadsheet with color-coded status badges, KPI cards, and formatted tables.

---

## 8. Author & Project Credits

**Created by Pramod Mahajan**
- **GitHub**: [@pramod0114](https://github.com/pramod0114) — [https://github.com/pramod0114](https://github.com/pramod0114)
- **Project**: RecoverAI — Autonomous AI Revenue Recovery Platform
- **Track**: Razorpay Buildathon Track 03: *AI Revenue Recovery*
