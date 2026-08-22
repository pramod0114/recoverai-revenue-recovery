# RecoverAI REST API Specification

Base Path: `/api`

### Health
- `GET /api/health`
  - Returns operational status, DB connection mode, uptime, and record telemetry.

### Authentication
- `POST /api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
  - Returns: `{ "success": true, "data": { "token": "...", "user": { ... } } }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
- `POST /api/auth/logout`

### Dashboard Telemetry
- `GET /api/dashboard/kpis`
  - Returns calculated metrics: `totalProcessedVolume`, `revenueAtRisk`, `recoveredRevenue`, `recoveryRate`, `failedPaymentsCount`, `activeRecoveryCases`.
- `GET /api/dashboard/trend`
  - Returns 14-day aggregated volume, at-risk and recovered trend.
- `GET /api/dashboard/failure-breakdown`
  - Returns failure counts, at-risk volume, and recovery rates by root-cause category.

### Payments
- `GET /api/payments?status=FAILED&page=1&limit=25`
- `GET /api/payments/:id`
- `POST /api/payments/:id/retry`

### Recovery Pipeline
- `GET /api/recovery/cases?status=OPEN&page=1`
- `GET /api/recovery/cases/:id`
- `POST /api/recovery/cases/:id/action`
  - Body: `{ "actionType": "DYNAMIC_RETRY" | "WHATSAPP_LINK" | "EMAIL_DUNNING", "channel": "WHATSAPP" }`
- `POST /api/recovery/batch-diagnose`

### Audit Trail
- `GET /api/audit/logs?actorType=SYSTEM_AI_AGENT`
