import {
  ControlledRecoveryAction,
  ExecutionResult,
  VerificationResult
} from './types.js';
import { AuditService } from './AuditService.js';
import { memoryStore } from '../db/connection.js';

export class RecoveryVerifier {
  private auditService: AuditService;

  constructor(auditService?: AuditService) {
    this.auditService = auditService || AuditService.getInstance();
  }

  /**
   * Verify the real outcome of an executed recovery action.
   * Ensures money is only marked RECOVERED when explicitly verified.
   */
  public async verify(
    executionResult: ExecutionResult,
    context: {
      amount: number;
      retry_count: number;
      recovery_probability?: number;
    }
  ): Promise<VerificationResult> {
    const { case_id, transaction_id, action, status, simulated_response } = executionResult;
    const now = new Date().toISOString();

    let verifiedStatus: VerificationResult['verified_status'] = 'FAILED';
    let isRecovered = false;
    let verifiedAmount = 0;
    let details = '';
    let nextAllowedAction: ControlledRecoveryAction | undefined = undefined;

    // Case 1: RETRY_PAYMENT verification
    if (action === 'RETRY_PAYMENT') {
      if (status === 'SUCCESS' && simulated_response?.status === 'captured') {
        verifiedStatus = 'RECOVERED';
        isRecovered = true;
        verifiedAmount = context.amount;
        details = `Razorpay Test Gateway confirmed payment capture (${simulated_response.payment_id}). Full amount ₹${context.amount} successfully settled.`;
      } else {
        verifiedStatus = 'FAILED';
        isRecovered = false;
        verifiedAmount = 0;
        const newRetryCount = context.retry_count + 1;
        if (newRetryCount >= 3) {
          nextAllowedAction = 'HUMAN_ESCALATION';
          details = `Retry failed (${simulated_response?.failure_reason || 'Bank Gateway Error'}). Maximum retry limit (3) reached; escalated to human desk.`;
        } else if ((context.recovery_probability ?? 0.5) >= 0.40) {
          nextAllowedAction = 'GENERATE_PAYMENT_LINK';
          details = `Retry failed. Fallback payment link recommended for direct customer settlement.`;
        } else {
          nextAllowedAction = 'HUMAN_ESCALATION';
          details = `Retry failed with low recovery probability. Routed to human escalation.`;
        }
      }
    }
    // Case 2: GENERATE_PAYMENT_LINK verification
    else if (action === 'GENERATE_PAYMENT_LINK') {
      if (status === 'SUCCESS' && executionResult.payment_link_url) {
        verifiedStatus = 'RECOVERED'; // or PENDING link completion in real-time, in test mode link is successfully issued and ready
        // In strictly verified payment lifecycle: link issued is an active workflow step
        // However, link created means delivery is confirmed
        details = `Payment link successfully generated and active: ${executionResult.payment_link_url}. Link delivered to customer.`;
        isRecovered = false; // Money is NOT marked recovered until customer pays link
        verifiedStatus = 'FAILED'; // remains open/unrecovered until webhook
        nextAllowedAction = 'SEND_PAYMENT_REMINDER';
      } else {
        verifiedStatus = 'FAILED';
        details = `Failed to generate payment link: ${simulated_response?.error || 'Gateway timeout'}`;
        nextAllowedAction = 'HUMAN_ESCALATION';
      }
    }
    // Case 3: SEND_PAYMENT_REMINDER / SUGGEST_ALTERNATE_METHOD verification
    else if (action === 'SEND_PAYMENT_REMINDER' || action === 'SUGGEST_ALTERNATE_METHOD') {
      if (status === 'SUCCESS') {
        details = `Customer intervention delivered via WhatsApp/SMS. Awaiting customer authorization.`;
        isRecovered = false;
        verifiedStatus = 'FAILED'; // Active waiting
        nextAllowedAction = 'HUMAN_ESCALATION';
      } else {
        details = `Failed to dispatch reminder: ${simulated_response?.error}`;
        nextAllowedAction = 'HUMAN_ESCALATION';
      }
    }
    // Case 4: HUMAN_ESCALATION verification
    else if (action === 'HUMAN_ESCALATION') {
      verifiedStatus = 'ESCALATED';
      isRecovered = false;
      details = `Case successfully transferred to human recovery specialist team. Ticket ID: ${simulated_response?.escalation_id || 'ESC_PRIORITY'}`;
      nextAllowedAction = undefined;
    }
    // Case 5: NO_ACTION verification
    else if (action === 'NO_ACTION') {
      verifiedStatus = 'BLOCKED';
      isRecovered = false;
      details = 'No action was executed in accordance with bounding safety policy.';
    }

    const verificationResult: VerificationResult = {
      case_id,
      transaction_id,
      action,
      verified_status: verifiedStatus,
      is_recovered: isRecovered,
      verified_amount: verifiedAmount,
      verification_source: 'RAZORPAY_TEST_GATEWAY',
      details,
      verified_at: now,
      next_allowed_action: nextAllowedAction
    };

    // Audit log verification event
    this.auditService.log({
      case_id,
      transaction_id,
      agent: 'RecoveryVerifier',
      event: isRecovered ? 'PAYMENT_RECOVERED' : 'PAYMENT_VERIFICATION_RESULT',
      decision: action,
      action: action,
      previous_state: 'EXECUTING',
      new_state: isRecovered ? 'RECOVERED' : verifiedStatus === 'ESCALATED' ? 'ESCALATED' : 'FAILED',
      reason: details,
      result: {
        is_recovered: isRecovered,
        verified_amount: verifiedAmount,
        next_allowed_action: nextAllowedAction
      },
      model_version: 'recovery-model-v1'
    });

    return verificationResult;
  }
}
