-- Migration: 001_initial_schema.sql
-- Description: Creates initial RecoverAI schema including tables for auth, payments, recovery pipeline, audit logs, and subscriptions.

-- Source identical to database/schema.sql
SELECT 'Executing 001_initial_schema.sql migration...' AS status;
SOURCE database/schema.sql;
