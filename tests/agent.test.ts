import { describe, it, expect, beforeEach } from 'vitest';
import { RecoveryStateMachine } from '../server/agent/StateMachine.js';
import { PolicyEngine } from '../server/agent/PolicyEngine.js';
import { AgentDecisionEngine } from '../server/agent/DecisionEngine.js';
import { RecoveryExecutor } from '../server/agent/RecoveryExecutor.js';
import { RecoveryVerifier } from '../server/agent/RecoveryVerifier.js';
import { RecoveryAgent } from '../server/agent/RecoveryAgent.js';
import { AuditService } from '../server/agent/AuditService.js';
import { RazorpayTestAdapter } from '../server/agent/RazorpayTestAdapter.js';

describe('Part 3 — AI Revenue Recovery Agent & Bounded Workflow', () => {
  describe('1. State Machine Transitions', () => {
    it('allows valid sequential workflow state transitions', () => {
      expect(RecoveryStateMachine.canTransition('DETECTED', 'ANALYZING')).toBe(true);
      expect(RecoveryStateMachine.canTransition('ANALYZING', 'RECOMMENDED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('RECOMMENDED', 'POLICY_CHECK')).toBe(true);
      expect(RecoveryStateMachine.canTransition('POLICY_CHECK', 'APPROVED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('APPROVED', 'EXECUTING')).toBe(true);
      expect(RecoveryStateMachine.canTransition('EXECUTING', 'VERIFYING')).toBe(true);
      expect(RecoveryStateMachine.canTransition('VERIFYING', 'RECOVERED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('RECOVERED', 'CLOSED')).toBe(true);
    });

    it('allows branching transitions to BLOCKED, FAILED, and ESCALATED', () => {
      expect(RecoveryStateMachine.canTransition('POLICY_CHECK', 'BLOCKED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('EXECUTING', 'FAILED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('RECOMMENDED', 'ESCALATED')).toBe(true);
      expect(RecoveryStateMachine.canTransition('FAILED', 'ESCALATED')).toBe(true);
    });

    it('strictly disallows illegal state transitions', () => {
      // Cannot jump from DETECTED straight to RECOVERED
      expect(RecoveryStateMachine.canTransition('DETECTED', 'RECOVERED')).toBe(false);
      expect(() => RecoveryStateMachine.transition('DETECTED', 'RECOVERED')).toThrowError(
        /Invalid workflow state transition/
      );

      // Cannot execute once already RECOVERED
      expect(RecoveryStateMachine.canTransition('RECOVERED', 'EXECUTING')).toBe(false);
      expect(() => RecoveryStateMachine.transition('RECOVERED', 'EXECUTING')).toThrowError(
        /Invalid workflow state transition/
      );

      // Cannot execute once CLOSED
      expect(RecoveryStateMachine.canTransition('CLOSED', 'EXECUTING')).toBe(false);
    });
  });

  describe('2. Policy Enforcement & Boundary Rules', () => {
    let policyEngine: PolicyEngine;

    beforeEach(() => {
      policyEngine = new PolicyEngine({
        max_retries: 3,
        auto_retry_threshold: 0.70,
        stop_after_success: true,
        max_amount_for_auto_retry: 100000
      });
    });

    it('blocks RETRY_PAYMENT if retry_count >= 3 (Max Retries Bound)', () => {
      const evalResult = policyEngine.evaluate('RETRY_PAYMENT', {
        case_id: 'case_test_01',
        amount: 2500,
        retry_count: 3,
        recovery_probability: 0.85
      });

      expect(evalResult.passed).toBe(false);
      expect(evalResult.violations).toContain('MAX_RETRIES_EXCEEDED');
      expect(evalResult.allowed_action).toBe('HUMAN_ESCALATION');
    });

    it('blocks automated RETRY_PAYMENT if recovery_probability < 0.70', () => {
      const evalResult = policyEngine.evaluate('RETRY_PAYMENT', {
        case_id: 'case_test_02',
        amount: 1500,
        retry_count: 1,
        recovery_probability: 0.55
      });

      expect(evalResult.passed).toBe(false);
      expect(evalResult.violations).toContain('LOW_PROBABILITY_RETRY_BLOCKED');
      expect(evalResult.allowed_action).toBe('SEND_PAYMENT_REMINDER');
    });

    it('blocks automated actions for amounts exceeding high-value cap', () => {
      const evalResult = policyEngine.evaluate('RETRY_PAYMENT', {
        case_id: 'case_test_03',
        amount: 150000, // > 100,000
        retry_count: 0,
        recovery_probability: 0.90
      });

      expect(evalResult.passed).toBe(false);
      expect(evalResult.violations).toContain('HIGH_VALUE_MANUAL_REVIEW_REQUIRED');
      expect(evalResult.allowed_action).toBe('HUMAN_ESCALATION');
    });

    it('blocks actions on already recovered cases (Stop After Success)', () => {
      const evalResult = policyEngine.evaluate('RETRY_PAYMENT', {
        case_id: 'case_test_04',
        amount: 2000,
        retry_count: 1,
        recovery_probability: 0.80,
        case_status: 'RECOVERED'
      });

      expect(evalResult.passed).toBe(false);
      expect(evalResult.violations).toContain('CASE_ALREADY_RECOVERED');
      expect(evalResult.allowed_action).toBe('NO_ACTION');
    });

    it('passes evaluation when all bounding constraints are satisfied', () => {
      const evalResult = policyEngine.evaluate('RETRY_PAYMENT', {
        case_id: 'case_test_05',
        amount: 3500,
        retry_count: 1,
        recovery_probability: 0.82
      });

      expect(evalResult.passed).toBe(true);
      expect(evalResult.violations).toHaveLength(0);
      expect(evalResult.allowed_action).toBe('RETRY_PAYMENT');
      expect(evalResult.is_automated).toBe(true);
    });
  });

  describe('3. Execution Safety & Razorpay Test Mode', () => {
    let executor: RecoveryExecutor;
    let adapter: RazorpayTestAdapter;

    beforeEach(() => {
      adapter = RazorpayTestAdapter.getInstance();
      executor = new RecoveryExecutor(adapter);
      executor.resetIdempotency();
    });

    it('strictly executes in test mode without processing real money', async () => {
      const res = await executor.execute({
        case_id: 'case_sec_01',
        transaction_id: 'txn_sec_01',
        action: 'GENERATE_PAYMENT_LINK',
        amount: 4500,
        customer_name: 'Aditi Sharma'
      });

      expect(res.test_mode).toBe(true);
      expect(res.status).toBe('SUCCESS');
      expect(res.payment_link_url).toContain('https://rzp.io/i/test_');
      expect(res.simulated_response.mode).toBe('TEST');
    });

    it('enforces idempotency protection against duplicate execution calls', async () => {
      const idempotencyKey = 'idemp_key_unique_test_999';

      const firstExec = await executor.execute({
        case_id: 'case_sec_02',
        transaction_id: 'txn_sec_02',
        action: 'SEND_PAYMENT_REMINDER',
        amount: 1200,
        idempotency_key: idempotencyKey
      });

      const secondExec = await executor.execute({
        case_id: 'case_sec_02',
        transaction_id: 'txn_sec_02',
        action: 'SEND_PAYMENT_REMINDER',
        amount: 1200,
        idempotency_key: idempotencyKey
      });

      expect(secondExec.execution_id).toBe(firstExec.execution_id);
      expect(secondExec.executed_at).toBe(firstExec.executed_at);
    });
  });

  describe('4. Recovery Verification Logic', () => {
    let verifier: RecoveryVerifier;

    beforeEach(() => {
      verifier = new RecoveryVerifier();
    });

    it('never claims money was recovered unless gateway explicitly captured funds', async () => {
      const failedExec = {
        execution_id: 'exec_fail_01',
        case_id: 'case_ver_01',
        transaction_id: 'txn_ver_01',
        action: 'RETRY_PAYMENT' as const,
        status: 'FAILED' as const,
        test_mode: true as const,
        simulated_response: {
          success: false,
          status: 'failed',
          failure_reason: 'Issuer bank decline'
        },
        executed_at: new Date().toISOString()
      };

      const verification = await verifier.verify(failedExec, {
        amount: 5000,
        retry_count: 1,
        recovery_probability: 0.60
      });

      expect(verification.is_recovered).toBe(false);
      expect(verification.verified_amount).toBe(0);
      expect(verification.verified_status).toBe('FAILED');
    });

    it('confirms recovery when payment gateway confirms captured transaction', async () => {
      const capturedExec = {
        execution_id: 'exec_cap_01',
        case_id: 'case_ver_02',
        transaction_id: 'txn_ver_02',
        action: 'RETRY_PAYMENT' as const,
        status: 'SUCCESS' as const,
        test_mode: true as const,
        simulated_response: {
          success: true,
          status: 'captured',
          payment_id: 'pay_test_cap_123'
        },
        executed_at: new Date().toISOString()
      };

      const verification = await verifier.verify(capturedExec, {
        amount: 8500,
        retry_count: 0,
        recovery_probability: 0.85
      });

      expect(verification.is_recovered).toBe(true);
      expect(verification.verified_amount).toBe(8500);
      expect(verification.verified_status).toBe('RECOVERED');
    });
  });

  describe('5. Full End-to-End Recovery Workflow & Audit Trail', () => {
    let agent: RecoveryAgent;
    let auditService: AuditService;

    beforeEach(() => {
      agent = RecoveryAgent.getInstance();
      auditService = AuditService.getInstance();
    });

    it('runs end-to-end analysis, policy check, execution, verification, and audit logging', async () => {
      const caseId = `case_e2e_${Date.now()}`;
      const txnId = `txn_e2e_${Date.now()}`;

      const result = await agent.runEndToEndWorkflow({
        case_id: caseId,
        transaction_id: txnId,
        amount: 3200,
        payment_method: 'UPI',
        failure_reason: 'Network Glitch Gateway Timeout',
        retry_count: 0,
        recovery_probability: 0.88,
        risk_score: 0.20
      });

      expect(result.decision).toBeDefined();
      expect(result.decision.recommended_action).toBe('RETRY_PAYMENT');
      expect(result.decision.confidence).toBeGreaterThan(0);
      expect(result.decision.policy_result.passed).toBe(true);

      // Verify audit logs were written
      const logs = auditService.getCaseAuditTrail(caseId);
      expect(logs.length).toBeGreaterThanOrEqual(3);

      const events = logs.map((l) => l.event);
      expect(events).toContain('ANALYSIS_INITIATED');
      expect(events).toContain('RECOMMENDATION_GENERATED');
      expect(events).toContain('POLICY_CHECK');

      // Check audit entry schema integrity
      const sampleLog = logs[0];
      expect(sampleLog.case_id).toBe(caseId);
      expect(sampleLog.model_version).toBe('recovery-model-v1');
      expect(sampleLog.timestamp).toBeDefined();
    });

    it('escalates to human when max retries exceeded during analysis', async () => {
      const caseId = `case_esc_${Date.now()}`;
      const txnId = `txn_esc_${Date.now()}`;

      const decision = await agent.analyze({
        case_id: caseId,
        transaction_id: txnId,
        amount: 2500,
        payment_method: 'CARD',
        failure_reason: 'Persistent Decline',
        retry_count: 3 // Max retries exceeded
      });

      expect(decision.recommended_action).toBe('HUMAN_ESCALATION');
      expect(decision.reason).toContain('Maximum automated retry ceiling');
    });
  });
});
