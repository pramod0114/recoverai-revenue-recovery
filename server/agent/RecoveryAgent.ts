import {
  AgentAnalysisInput,
  AgentDecision,
  ControlledRecoveryAction,
  ExecutionResult,
  HumanEscalationPayload,
  VerificationResult,
  WorkflowState
} from './types.js';
import { RecoveryStateMachine } from './StateMachine.js';
import { AgentDecisionEngine } from './DecisionEngine.js';
import { PolicyEngine } from './PolicyEngine.js';
import { RecoveryExecutor } from './RecoveryExecutor.js';
import { RecoveryVerifier } from './RecoveryVerifier.js';
import { AuditService } from './AuditService.js';
import { memoryStore } from '../db/connection.js';
import { RecoveryCaseRecord } from '../types/index.js';

export class RecoveryAgent {
  private static instance: RecoveryAgent;

  public decisionEngine: AgentDecisionEngine;
  public policyEngine: PolicyEngine;
  public executor: RecoveryExecutor;
  public verifier: RecoveryVerifier;
  public auditService: AuditService;

  private constructor() {
    this.policyEngine = new PolicyEngine();
    this.decisionEngine = new AgentDecisionEngine(this.policyEngine);
    this.executor = new RecoveryExecutor();
    this.verifier = new RecoveryVerifier();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): RecoveryAgent {
    if (!RecoveryAgent.instance) {
      RecoveryAgent.instance = new RecoveryAgent();
    }
    return RecoveryAgent.instance;
  }

  /**
   * STEP 1: ANALYZE FAILED PAYMENT & POLICY CHECK
   */
  public async analyze(input: AgentAnalysisInput): Promise<AgentDecision> {
    const caseId = input.case_id || `rc_${input.transaction_id || Date.now()}`;
    const transactionId = input.transaction_id || `txn_${Date.now()}`;

    // 1. Audit: DETECTED -> ANALYZING
    this.auditService.log({
      case_id: caseId,
      transaction_id: transactionId,
      agent: 'RecoveryAgent',
      event: 'ANALYSIS_INITIATED',
      previous_state: 'DETECTED',
      new_state: 'ANALYZING',
      reason: `Agent began ML diagnostics and risk analysis for transaction ${transactionId}`,
      model_version: 'recovery-model-v1'
    });

    // 2. Compute Decision via ML prediction and policy bounding
    const decision = await this.decisionEngine.decide(input);

    // 3. Audit: ANALYZING -> RECOMMENDED
    this.auditService.log({
      case_id: caseId,
      transaction_id: transactionId,
      agent: 'RecoveryAgent',
      event: 'RECOMMENDATION_GENERATED',
      decision: decision.recommended_action,
      previous_state: 'ANALYZING',
      new_state: 'RECOMMENDED',
      reason: decision.reason,
      result: {
        confidence: decision.confidence,
        recovery_probability: decision.recovery_probability,
        root_cause: decision.root_cause
      },
      model_version: 'recovery-model-v1'
    });

    // 4. Audit: RECOMMENDED -> POLICY_CHECK
    const policyResult = decision.policy_result;
    const nextState: WorkflowState = policyResult.passed ? 'APPROVED' : 'BLOCKED';

    this.auditService.log({
      case_id: caseId,
      transaction_id: transactionId,
      agent: 'PolicyEngine',
      event: 'POLICY_CHECK',
      decision: decision.recommended_action,
      action: decision.recommended_action,
      previous_state: 'RECOMMENDED',
      new_state: nextState,
      reason: policyResult.reason,
      result: {
        passed: policyResult.passed,
        violations: policyResult.violations,
        allowed_action: policyResult.allowed_action
      },
      model_version: 'recovery-model-v1'
    });

    // 5. Update or Upsert Recovery Case in memoryStore
    let existingCase = memoryStore.recoveryCases.get(caseId);
    const now = new Date().toISOString();

    if (existingCase) {
      existingCase.ml_recovery_probability = decision.recovery_probability;
      existingCase.recovery_probability = decision.recovery_probability;
      existingCase.risk_level =
        decision.risk_score >= 0.7 ? 'HIGH' : decision.risk_score >= 0.4 ? 'MEDIUM' : 'LOW';
      existingCase.recommended_strategy = decision.recommended_action;
      existingCase.primary_failure_diagnosis = decision.root_cause;
      existingCase.status = policyResult.passed ? 'OPEN' : 'DISMISSED';
      existingCase.updated_at = now;
      (existingCase as any).workflow_state = nextState;
      (existingCase as any).reason = decision.reason;
      (existingCase as any).confidence = decision.confidence;
    } else {
      const newCase: any = {
        id: caseId,
        payment_id: input.transaction_id,
        transaction_id: input.transaction_id,
        customer_id: input.customer_id || `cust_${Date.now()}`,
        customer_name: input.customer_name || 'Customer',
        customer_email: input.customer_email || 'customer@example.com',
        customer_phone: input.customer_phone || '+919876543210',
        merchant_id: 'mer_demo_101',
        payment_method: input.payment_method || 'UPI',
        at_risk_amount: input.amount,
        currency: 'INR',
        ml_recovery_probability: decision.recovery_probability,
        recovery_probability: decision.recovery_probability,
        risk_level: decision.risk_score >= 0.7 ? 'HIGH' : decision.risk_score >= 0.4 ? 'MEDIUM' : 'LOW',
        primary_failure_diagnosis: decision.root_cause,
        recommended_strategy: decision.recommended_action,
        status: policyResult.passed ? 'OPEN' : 'DISMISSED',
        actions_taken_count: input.retry_count || 0,
        recovered_amount: 0,
        recovered_at: null,
        closed_at: null,
        created_at: now,
        updated_at: now,
        workflow_state: nextState,
        reason: decision.reason,
        confidence: decision.confidence
      };
      memoryStore.recoveryCases.set(caseId, newCase as RecoveryCaseRecord);
    }

    return {
      ...decision,
      workflow_state: nextState
    };
  }

  /**
   * STEP 2: EXECUTE APPROVED RECOVERY ACTION & VERIFY
   */
  public async execute(params: {
    case_id: string;
    override_action?: ControlledRecoveryAction;
    idempotency_key?: string;
  }): Promise<{
    case_id: string;
    workflow_state: WorkflowState;
    execution: ExecutionResult;
    verification: VerificationResult;
    case: any;
  }> {
    const rCase: any = memoryStore.recoveryCases.get(params.case_id);
    if (!rCase) {
      throw new Error(`Recovery case not found: ${params.case_id}`);
    }

    const currentWorkflowState: WorkflowState = rCase.workflow_state || 'APPROVED';
    const actionToRun: ControlledRecoveryAction =
      params.override_action || rCase.recommended_strategy || 'RETRY_PAYMENT';

    // 1. Policy Re-check on execution time
    const policyResult = this.policyEngine.evaluate(actionToRun, {
      case_id: rCase.id,
      amount: rCase.at_risk_amount,
      retry_count: rCase.actions_taken_count || 0,
      recovery_probability: rCase.ml_recovery_probability ?? 0.75,
      case_status: rCase.status
    });

    if (!policyResult.passed) {
      rCase.workflow_state = 'BLOCKED';
      this.auditService.log({
        case_id: rCase.id,
        transaction_id: rCase.transaction_id,
        agent: 'PolicyEngine',
        event: 'EXECUTION_BLOCKED',
        decision: actionToRun,
        action: actionToRun,
        previous_state: currentWorkflowState,
        new_state: 'BLOCKED',
        reason: `Execution halted by policy: ${policyResult.reason}`,
        model_version: 'recovery-model-v1'
      });

      return {
        case_id: rCase.id,
        workflow_state: 'BLOCKED',
        execution: {
          execution_id: `exec_blocked_${Date.now()}`,
          case_id: rCase.id,
          transaction_id: rCase.transaction_id || rCase.id,
          action: actionToRun,
          status: 'BLOCKED',
          test_mode: true,
          simulated_response: { error: policyResult.reason },
          executed_at: new Date().toISOString()
        },
        verification: {
          case_id: rCase.id,
          transaction_id: rCase.transaction_id || rCase.id,
          action: actionToRun,
          verified_status: 'BLOCKED',
          is_recovered: false,
          verified_amount: 0,
          verification_source: 'RAZORPAY_TEST_GATEWAY',
          details: policyResult.reason,
          verified_at: new Date().toISOString()
        },
        case: rCase
      };
    }

    // 2. Validate and transition state to EXECUTING
    RecoveryStateMachine.transition(currentWorkflowState, 'EXECUTING', `Initiating recovery action ${actionToRun}`);
    rCase.workflow_state = 'EXECUTING';

    this.auditService.log({
      case_id: rCase.id,
      transaction_id: rCase.transaction_id,
      agent: 'RecoveryExecutor',
      event: 'EXECUTION_DISPATCHED',
      decision: actionToRun,
      action: actionToRun,
      previous_state: 'APPROVED',
      new_state: 'EXECUTING',
      reason: `Dispatched test-mode recovery action: ${actionToRun}`,
      model_version: 'recovery-model-v1'
    });

    // 3. Execute bounded test-mode action
    const executionResult = await this.executor.execute({
      case_id: rCase.id,
      transaction_id: rCase.transaction_id || rCase.id,
      action: actionToRun,
      amount: rCase.at_risk_amount,
      currency: rCase.currency || 'INR',
      payment_method: rCase.payment_method || 'UPI',
      customer_id: rCase.customer_id,
      customer_name: rCase.customer_name,
      customer_email: rCase.customer_email,
      customer_phone: rCase.customer_phone,
      recovery_probability: rCase.ml_recovery_probability,
      root_cause: rCase.primary_failure_diagnosis,
      idempotency_key: params.idempotency_key
    });

    // 4. Verify outcome via RecoveryVerifier
    const verificationResult = await this.verifier.verify(executionResult, {
      amount: rCase.at_risk_amount,
      retry_count: rCase.actions_taken_count || 0,
      recovery_probability: rCase.ml_recovery_probability
    });

    // 5. Update case state based on verified outcome
    rCase.actions_taken_count = (rCase.actions_taken_count || 0) + 1;
    rCase.updated_at = new Date().toISOString();
    rCase.executed_action = actionToRun;
    rCase.result = verificationResult.details;

    if (verificationResult.is_recovered) {
      rCase.workflow_state = 'RECOVERED';
      rCase.status = 'RECOVERED';
      rCase.recovered_amount = verificationResult.verified_amount;
      rCase.recovered_at = verificationResult.verified_at;
      rCase.closed_at = verificationResult.verified_at;

      // Update associated payment record
      const payment = memoryStore.payments.get(rCase.payment_id);
      if (payment) {
        payment.payment_status = 'RECOVERED';
        payment.recovery_status = 'RECOVERED';
        payment.recovered_amount = verificationResult.verified_amount;
      }
    } else if (verificationResult.verified_status === 'ESCALATED') {
      rCase.workflow_state = 'ESCALATED';
      rCase.status = 'IN_PROGRESS';
    } else {
      rCase.workflow_state = 'FAILED';
      rCase.status = 'FAILED';
      if (verificationResult.next_allowed_action) {
        rCase.recommended_strategy = verificationResult.next_allowed_action;
      }
    }

    return {
      case_id: rCase.id,
      workflow_state: rCase.workflow_state,
      execution: executionResult,
      verification: verificationResult,
      case: rCase
    };
  }

  /**
   * STEP 3: VERIFY CASE STATUS
   */
  public async verifyCase(caseId: string): Promise<VerificationResult> {
    const rCase: any = memoryStore.recoveryCases.get(caseId);
    if (!rCase) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const mockExecution: ExecutionResult = {
      execution_id: `verify_chk_${Date.now()}`,
      case_id: rCase.id,
      transaction_id: rCase.transaction_id || rCase.id,
      action: rCase.executed_action || rCase.recommended_strategy || 'RETRY_PAYMENT',
      status: rCase.status === 'RECOVERED' ? 'SUCCESS' : 'PENDING_VERIFICATION',
      test_mode: true,
      simulated_response: {
        status: rCase.status === 'RECOVERED' ? 'captured' : 'pending',
        payment_id: `pay_test_${rCase.transaction_id}`
      },
      executed_at: new Date().toISOString()
    };

    return await this.verifier.verify(mockExecution, {
      amount: rCase.at_risk_amount,
      retry_count: rCase.actions_taken_count || 0,
      recovery_probability: rCase.ml_recovery_probability
    });
  }

  /**
   * STEP 4: ESCALATE CASE TO HUMAN OPERATOR
   */
  public async escalate(payload: HumanEscalationPayload): Promise<any> {
    const rCase: any = memoryStore.recoveryCases.get(payload.case_id);
    if (!rCase) {
      throw new Error(`Case not found: ${payload.case_id}`);
    }

    const previousState = rCase.workflow_state || 'ANALYZING';
    RecoveryStateMachine.transition(previousState, 'ESCALATED', 'Manual or automated escalation');

    rCase.workflow_state = 'ESCALATED';
    rCase.status = 'IN_PROGRESS';
    rCase.escalation_details = {
      reason: payload.reason,
      priority: payload.priority || 'HIGH',
      assigned_status: payload.assigned_status || 'PENDING_REVIEW',
      operator_notes: payload.operator_notes,
      created_at: new Date().toISOString()
    };
    rCase.updated_at = new Date().toISOString();

    this.auditService.log({
      case_id: rCase.id,
      transaction_id: rCase.transaction_id,
      agent: 'RecoveryAgent',
      event: 'HUMAN_ESCALATION_RECORDED',
      decision: 'HUMAN_ESCALATION',
      action: 'HUMAN_ESCALATION',
      previous_state: previousState,
      new_state: 'ESCALATED',
      reason: payload.reason,
      result: rCase.escalation_details,
      model_version: 'recovery-model-v1'
    });

    return {
      success: true,
      case_id: rCase.id,
      workflow_state: 'ESCALATED',
      escalation: rCase.escalation_details
    };
  }

  /**
   * STEP 5: RUN COMPLETE END-TO-END RECOVERY WORKFLOW
   */
  public async runEndToEndWorkflow(input: AgentAnalysisInput): Promise<any> {
    // 1. Analyze & Policy Check
    const decision = await this.analyze(input);

    // 2. If approved and automated, execute & verify immediately
    if (decision.workflow_state === 'APPROVED' && decision.policy_result.is_automated) {
      const execOut = await this.execute({
        case_id: decision.case_id,
        override_action: decision.recommended_action
      });
      return {
        decision,
        execution: execOut.execution,
        verification: execOut.verification,
        workflow_state: execOut.workflow_state,
        case: execOut.case
      };
    }

    // Otherwise return decision with BLOCKED/RECOMMENDED state
    const currentCase = memoryStore.recoveryCases.get(decision.case_id);
    return {
      decision,
      workflow_state: decision.workflow_state,
      case: currentCase
    };
  }
}
