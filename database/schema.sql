-- ==========================================================
-- RECOVERAI - AI REVENUE RECOVERY AGENT
-- Target Database: MySQL 8.0+ / MariaDB 10.5+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS recoverai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recoverai_db;

-- ----------------------------------------------------------
-- 1. USERS & ROLES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'ANALYST', 'OPERATOR') NOT NULL DEFAULT 'ANALYST',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 2. MERCHANTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    business_category VARCHAR(100) NOT NULL,
    monthly_volume_est DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    recovery_automation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_merchants_category (business_category)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 3. CUSTOMERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(150) NOT NULL,
    customer_age_days INT NOT NULL DEFAULT 1,
    lifetime_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_successful_payments INT NOT NULL DEFAULT 0,
    total_failed_payments INT NOT NULL DEFAULT 0,
    risk_score DECIMAL(5, 4) NOT NULL DEFAULT 0.0500, -- 0.0000 to 1.0000
    preferred_payment_method VARCHAR(50) DEFAULT 'UPI',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    INDEX idx_customers_merchant (merchant_id),
    INDEX idx_customers_email (email),
    INDEX idx_customers_risk (risk_score)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 4. SUBSCRIPTIONS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    billing_interval ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    consecutive_failed_cycles INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_customer (customer_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 5. INVOICES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    subscription_id VARCHAR(36) NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    due_date TIMESTAMP NOT NULL,
    status ENUM('DRAFT', 'ISSUED', 'PAID', 'PAST_DUE', 'UNCOLLECTIBLE', 'VOID') NOT NULL DEFAULT 'ISSUED',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_due (due_date)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 6. PAYMENTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    merchant_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    subscription_id VARCHAR(36) NULL,
    invoice_id VARCHAR(36) NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_method ENUM('CARD_CREDIT', 'CARD_DEBIT', 'UPI', 'NETBANKING', 'WALLET', 'AUTO_DEBIT') NOT NULL,
    payment_status ENUM('SUCCESSFUL', 'FAILED', 'PENDING', 'RECOVERED', 'ABANDONED', 'REFUNDED') NOT NULL,
    failure_code VARCHAR(50) NULL,
    failure_reason VARCHAR(255) NULL,
    failure_category ENUM('INSUFFICIENT_FUNDS', 'BANK_DOWNTIME', 'EXPIRED_CARD', 'AUTHENTICATION_DROP', 'CUSTOMER_ABANDONMENT', 'FRAUD_SUSPICION', 'GATEWAY_ERROR', 'LIMIT_EXCEEDED', 'NONE') NOT NULL DEFAULT 'NONE',
    retry_count INT NOT NULL DEFAULT 0,
    checkout_status ENUM('COMPLETED', 'DROPPED', 'EXPIRED', 'SESSION_TIMEOUT') NOT NULL DEFAULT 'COMPLETED',
    recovery_status ENUM('NOT_APPLICABLE', 'AT_RISK', 'RECOVERING', 'RECOVERED', 'UNRECOVERABLE', 'EXPIRED') NOT NULL DEFAULT 'NOT_APPLICABLE',
    recovered_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    customer_age_days INT NOT NULL DEFAULT 30,
    previous_successful_payments INT NOT NULL DEFAULT 0,
    previous_failed_payments INT NOT NULL DEFAULT 0,
    previous_total_spend DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    INDEX idx_payments_status (payment_status),
    INDEX idx_payments_recovery_status (recovery_status),
    INDEX idx_payments_failure_code (failure_code),
    INDEX idx_payments_created_at (created_at),
    INDEX idx_payments_merchant_status (merchant_id, payment_status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 7. PAYMENT ATTEMPTS (Retries / Gateways)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_attempts (
    id VARCHAR(36) PRIMARY KEY,
    payment_id VARCHAR(36) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    gateway VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    payment_method VARCHAR(50) NOT NULL,
    status ENUM('SUCCESS', 'FAILURE', 'TIMEOUT') NOT NULL,
    error_code VARCHAR(50) NULL,
    error_message VARCHAR(255) NULL,
    latency_ms INT NOT NULL DEFAULT 450,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_attempts_payment (payment_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 8. RECOVERY CASES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS recovery_cases (
    id VARCHAR(36) PRIMARY KEY,
    payment_id VARCHAR(36) NOT NULL UNIQUE,
    customer_id VARCHAR(36) NOT NULL,
    merchant_id VARCHAR(36) NOT NULL,
    at_risk_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    ml_recovery_probability DECIMAL(5, 4) NOT NULL DEFAULT 0.5000, -- e.g. 0.8450 (84.5%)
    primary_failure_diagnosis VARCHAR(255) NOT NULL,
    recommended_strategy ENUM('SMART_RETRY_OFFPEAK', 'DUNNING_WHATSAPP', 'DUNNING_EMAIL', 'PAYMENT_LINK_SMS', 'METHOD_SWITCH_UPI', 'ONE_CLICK_MANDATE_UPDATE', 'MANUAL_INTERVENTION') NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'RECOVERED', 'FAILED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    actions_taken_count INT NOT NULL DEFAULT 0,
    recovered_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    recovered_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    INDEX idx_cases_status (status),
    INDEX idx_cases_probability (ml_recovery_probability),
    INDEX idx_cases_created (created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 9. RECOVERY ACTIONS (Execution & Workflow Steps)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS recovery_actions (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    action_type ENUM('DYNAMIC_RETRY', 'EMAIL_DUNNING', 'WHATSAPP_LINK', 'SMS_PAYMENT_PROMPT', 'SWITCH_ROUTING', 'DISCOUNT_INCENTIVE', 'MANUAL_OVERRIDE') NOT NULL,
    status ENUM('SCHEDULED', 'EXECUTED', 'DELIVERED', 'CLICKED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
    trigger_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_AGENT',
    payload_snapshot JSON NULL,
    result_response VARCHAR(500) NULL,
    scheduled_for TIMESTAMP NOT NULL,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES recovery_cases(id) ON DELETE CASCADE,
    INDEX idx_actions_case (case_id),
    INDEX idx_actions_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 10. NOTIFICATIONS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    case_id VARCHAR(36) NULL,
    channel ENUM('EMAIL', 'WHATSAPP', 'SMS', 'IN_APP') NOT NULL,
    template_id VARCHAR(100) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NULL,
    body_text TEXT NOT NULL,
    delivery_status ENUM('PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'OPENED', 'CLICKED') NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES recovery_cases(id) ON DELETE SET NULL,
    INDEX idx_notifications_customer (customer_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 11. AUDIT LOGS (Immutable Compliance & Action Trail)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_type ENUM('SYSTEM_AI_AGENT', 'ADMIN_USER', 'ANALYST_USER', 'WEBHOOK_EVENT') NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_state JSON NULL,
    new_state JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_actor (actor_type, actor_id)
) ENGINE=InnoDB;
