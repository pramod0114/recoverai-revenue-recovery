# RecoverAI System Architecture

## Overview
RecoverAI is an autonomous AI Revenue Recovery Agent built for **Razorpay Buildathon Track 03: "AI Revenue Recovery — Find revenue that's slipping away and win it back."**

### Core Pipeline
```
[Razorpay / Payment Stream]
            │
            ▼
[1. Detection & Ingestion Engine] (5,000+ Transactions)
            │
            ▼
[2. AI Diagnostic Microservice (FastAPI + Scikit-Learn)]
    ├── Categorize Root Cause (Insufficient Funds, Downtime, Expired Card, Dropouts)
    ├── Compute Win-Back Probability (0.0 to 1.0)
    └── Select Optimal Recovery Action (Smart Retry, WhatsApp Dunning, SMS Link, UPI Switch)
            │
            ▼
[3. Bounded Workflow Orchestrator (Node.js/Express)]
    ├── Policy Enforcement & Rate Limits
    ├── Multi-Channel Dispatch (WhatsApp / Email / SMS / Dynamic Retry)
    └── State Transition (OPEN -> IN_PROGRESS -> RECOVERED / FAILED)
            │
            ▼
[4. Verification & Audit Trail (MySQL 8.0)]
    ├── Immutable Audit Logs
    └── Real-time Financial Telemetry & Recovery Attribution
```

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router
- **Backend**: Node.js, Express, TypeScript (tsx/esbuild), JWT Authentication, CORS, REST APIs
- **Database**: MySQL 8.0+ (mysql2 pool with automatic high-performance indexed in-memory storage engine fallback for zero-dependency execution)
- **AI/ML Service**: Python 3.10+, FastAPI, Pandas, NumPy, Scikit-learn
