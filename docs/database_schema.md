# RecoverAI Database Schema Specification

Target Engine: **MySQL 8.0+ / MariaDB 10.5+**

## Relational Entity Model

### 1. `users`
User accounts with RBAC roles (`ADMIN`, `ANALYST`, `OPERATOR`) and secure bcrypt hashed passwords.
- `id` (VARCHAR(36), PK)
- `email` (VARCHAR(255), UNIQUE)
- `password_hash` (VARCHAR(255))
- `full_name` (VARCHAR(100))
- `role` (ENUM('ADMIN', 'ANALYST', 'OPERATOR'))
- `is_active` (BOOLEAN)
- `last_login_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. `merchants`
Merchant business profiles and volume configurations.
- `id` (VARCHAR(36), PK)
- `name` (VARCHAR(150))
- `email` (VARCHAR(255))
- `currency` (VARCHAR(3))
- `business_category` (VARCHAR(100))
- `monthly_volume_est` (DECIMAL(15,2))
- `recovery_automation_enabled` (BOOLEAN)

### 3. `customers`
Customer records, historical success rates, and risk scores.
- `id` (VARCHAR(36), PK)
- `merchant_id` (VARCHAR(36), FK -> merchants.id)
- `email` (VARCHAR(255))
- `phone` (VARCHAR(20))
- `name` (VARCHAR(150))
- `customer_age_days` (INT)
- `lifetime_value` (DECIMAL(12,2))
- `total_successful_payments` (INT)
- `total_failed_payments` (INT)
- `risk_score` (DECIMAL(5,4))
- `preferred_payment_method` (VARCHAR(50))

### 4. `payments`
Core transaction stream capturing successes, drops, and failures.
- `id` (VARCHAR(36), PK)
- `transaction_id` (VARCHAR(100), UNIQUE)
- `merchant_id` (VARCHAR(36), FK)
- `customer_id` (VARCHAR(36), FK)
- `amount` (DECIMAL(12,2))
- `currency` (VARCHAR(3))
- `payment_method` (ENUM)
- `payment_status` (ENUM('SUCCESSFUL', 'FAILED', 'PENDING', 'RECOVERED', 'ABANDONED', 'REFUNDED'))
- `failure_code` (VARCHAR(50))
- `failure_reason` (VARCHAR(255))
- `failure_category` (ENUM)
- `retry_count` (INT)
- `recovery_status` (ENUM('NOT_APPLICABLE', 'AT_RISK', 'RECOVERING', 'RECOVERED', 'UNRECOVERABLE', 'EXPIRED'))
- `recovered_amount` (DECIMAL(12,2))

### 5. `recovery_cases`
AI-instantiated recovery pipelines for failed or at-risk payments.
- `id` (VARCHAR(36), PK)
- `payment_id` (VARCHAR(36), UNIQUE, FK)
- `customer_id` (VARCHAR(36), FK)
- `merchant_id` (VARCHAR(36), FK)
- `at_risk_amount` (DECIMAL(12,2))
- `ml_recovery_probability` (DECIMAL(5,4))
- `primary_failure_diagnosis` (VARCHAR(255))
- `recommended_strategy` (ENUM)
- `status` (ENUM('OPEN', 'IN_PROGRESS', 'RECOVERED', 'FAILED', 'DISMISSED'))
- `actions_taken_count` (INT)
- `recovered_amount` (DECIMAL(12,2))

### 6. `recovery_actions`
Individual interventions executed by the AI Agent (WhatsApp, Retry, SMS, Email).

### 7. `audit_logs`
Immutable compliance trail recording actor (`SYSTEM_AI_AGENT`, `ADMIN_USER`, `ANALYST_USER`), action, entity, previous/new states, IP address, and timestamp.
