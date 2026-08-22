# RecoverAI — AI Revenue Recovery Agent (Part 1 Foundation)

Built for **Razorpay Buildathon Track 03: "AI Revenue Recovery — Find revenue that's slipping away and win it back."**

---

## 1. Project Overview

RecoverAI is an autonomous financial intelligence platform that detects at-risk payment failures, diagnoses the underlying technical or behavioral root causes, predicts the optimal win-back intervention strategy, executes bounded recovery workflows, and maintains an immutable audit trail.

---

## 2. Architecture & Tech Stack

```
[Razorpay / Payment Stream (5,000 txns)]
                    │
                    ▼
 [Node.js / Express.js Backend + Vite] ── [FastAPI Python ML Diagnostics]
                    │
                    ▼
       [MySQL 8.0 / In-Memory Store]
                    │
                    ▼
     [React 18 + TypeScript Dashboard]
```

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router
- **Backend**: Node.js, Express, TypeScript (tsx / esbuild), JWT Authentication, CORS, REST APIs
- **Database**: MySQL 8.0+ (mysql2 pool with automatic high-performance indexed in-memory fallback for zero-dependency execution)
- **AI/ML Service**: Python 3.10+, FastAPI, Pandas, NumPy, Scikit-learn

---

## 3. Directory Structure

```
recoverai/
├── backend/ (server/)
│   ├── db/
│   │   └── connection.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── audit.ts
│   │   ├── auth.ts
│   │   ├── customers.ts
│   │   ├── dashboard.ts
│   │   ├── health.ts
│   │   ├── payments.ts
│   │   └── recovery.ts
│   ├── seed.ts
│   └── types/
│       └── index.ts
├── data/
│   ├── generate_dataset.py
│   ├── generate_dataset.ts
│   └── synthetic_payments_5000.json
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── schema.sql
├── docs/
│   ├── api_specification.md
│   ├── architecture.md
│   └── database_schema.md
├── ml-service/
│   ├── app/
│   │   ├── config.py
│   │   ├── routes.py
│   │   └── schemas.py
│   ├── data/
│   │   └── README.md
│   ├── main.py
│   ├── models/
│   │   └── README.md
│   ├── requirements.txt
│   └── training/
│       ├── data_preprocessor.py
│       └── train_recovery_model.py
├── src/
│   ├── api/
│   │   └── client.ts
│   ├── components/
│   │   ├── dashboard/
│   │   └── layout/
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── AuditLogsPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MlDiagnosticsPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── RecoveryCasesPage.tsx
│   │   └── SystemHealthPage.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── metadata.json
├── package.json
├── README.md
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Setup & Running Instructions

### 4.1 Prerequisites
- Node.js 18+ / npm
- (Optional) MySQL 8.0+
- (Optional) Python 3.10+ with `pip`

### 4.2 Installation Commands
```bash
# 1. Install Node.js dependencies
npm install

# 2. Configure Environment variables
cp .env.example .env
```

### 4.3 Dataset Generation & Seeding
```bash
# Generate 5,000 realistic synthetic payments dataset
npm run generate-data

# Seed database schema & records
npm run seed
```

### 4.4 Run Full-Stack App (Frontend + Node.js Backend)
```bash
npm run dev
```
The unified full-stack application will be available at **`http://localhost:3000`**.

### 4.5 Run Python ML Microservice (Optional)
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
FastAPI service will be live at **`http://localhost:8000`** with OpenAPI docs at **`http://localhost:8000/docs`**.

---

## 5. Pre-Configured Demo Credentials

| Role | Email | Password |
|---|---|---|
| **ADMIN** | `admin@recoverai.io` | `Admin@RecoverAI2026` |
| **ANALYST** | `analyst@recoverai.io` | `Analyst@RecoverAI2026` |

*1-Click demo sign-in is also provided on the login page.*

---

## 6. Health & Verification Check

1. Health endpoint:
```bash
curl http://localhost:3000/api/health
```
2. KPIs endpoint:
```bash
curl http://localhost:3000/api/dashboard/kpis
```
3. Payments stream:
```bash
curl http://localhost:3000/api/payments?limit=5
```

---

## 7. Current Part 1 Limitations & Assumptions for Part 2

- **Part 1 Scope**: Lays the complete, working production foundation (schema, seed, full-stack server, 5,000 synthetic records, auth, dashboard metrics, ML architecture).
- **ML Engine**: Uses rule-assisted diagnostic baseline in Part 1; Part 2 will train and deploy full supervised gradient-boosted ML weights.
- **Razorpay Live Webhooks**: Running with realistic simulation & test sandbox configuration; production webhook signing keys are ready for live credential injection.
