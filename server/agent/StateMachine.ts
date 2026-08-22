import { WorkflowState } from './types.js';

export class InvalidStateTransitionError extends Error {
  public fromState: WorkflowState;
  public toState: WorkflowState;

  constructor(from: WorkflowState, to: WorkflowState, reason?: string) {
    super(`Invalid workflow state transition from '${from}' to '${to}'${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidStateTransitionError';
    this.fromState = from;
    this.toState = to;
  }
}

export class RecoveryStateMachine {
  // Allowed transition mapping matrix
  private static readonly ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
    DETECTED: ['ANALYZING', 'BLOCKED', 'CLOSED'],
    ANALYZING: ['RECOMMENDED', 'POLICY_CHECK', 'BLOCKED', 'ESCALATED', 'CLOSED'],
    RECOMMENDED: ['POLICY_CHECK', 'APPROVED', 'BLOCKED', 'ESCALATED', 'CLOSED'],
    POLICY_CHECK: ['APPROVED', 'BLOCKED', 'ESCALATED', 'RECOMMENDED', 'CLOSED'],
    APPROVED: ['EXECUTING', 'BLOCKED', 'ESCALATED', 'CLOSED'],
    EXECUTING: ['VERIFYING', 'FAILED', 'ESCALATED', 'BLOCKED'],
    VERIFYING: ['RECOVERED', 'FAILED', 'ESCALATED', 'BLOCKED', 'CLOSED'],
    RECOVERED: ['CLOSED'],
    FAILED: ['ANALYZING', 'ESCALATED', 'CLOSED', 'POLICY_CHECK'],
    BLOCKED: ['ANALYZING', 'ESCALATED', 'CLOSED', 'POLICY_CHECK'],
    ESCALATED: ['ANALYZING', 'APPROVED', 'CLOSED'],
    CLOSED: ['ANALYZING'] // Can only be re-opened for fresh analysis under manual override
  };

  /**
   * Validate if a transition from currentState to targetState is permitted.
   */
  public static canTransition(current: WorkflowState, target: WorkflowState): boolean {
    if (current === target) return true; // Idempotent same-state check
    const allowed = this.ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.includes(target) : false;
  }

  /**
   * Assert valid transition or throw InvalidStateTransitionError
   */
  public static transition(current: WorkflowState, target: WorkflowState, context?: string): WorkflowState {
    if (!this.canTransition(current, target)) {
      throw new InvalidStateTransitionError(current, target, context);
    }
    return target;
  }

  /**
   * Return all valid next states from current state
   */
  public static getNextAllowedStates(current: WorkflowState): WorkflowState[] {
    return this.ALLOWED_TRANSITIONS[current] || [];
  }
}
