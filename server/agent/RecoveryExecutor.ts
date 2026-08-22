import {
  ControlledRecoveryAction,
  ExecutionResult,
  HumanEscalationPayload,
  WorkflowState
} from './types.js';
import { RazorpayTestAdapter } from './RazorpayTestAdapter.js';
import { AuditService } from './AuditService.js';
import { memoryStore } from '../db/connection.js';

export class RecoveryExecutor {
  private adapter: RazorpayTestAdapter;
  private auditService: AuditService;
  private idempotencyStore: Map<string, ExecutionResult> = new Map();

  constructor(adapter?: RazorpayTestAdapter, auditService?: AuditService) {
    this.adapter = adapter || RazorpayTestAdapter.getInstance();
    this.auditService = auditService || AuditService.getInstance();
  }

  /**
   * Safely execute a bounded recovery action with idempotency protection.
   */
  public async execute(params: {
    case_id: string;
    transaction_id: string;
    action: ControlledRecoveryAction;
    amount: number;
    currency?: string;
    payment_method?: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    recovery_probability?: number;
    root_cause?: string;
    idempotency_key?: string;
  }): Promise<ExecutionResult> {
    const idempotencyKey =
      params.idempotency_key || `${params.case_id}:${params.action}:${params.transaction_id}`;

    // 1. Idempotency check: Return existing result if already executed with this key
    if (this.idempotencyStore.has(idempotencyKey)) {
      const cached = this.idempotencyStore.get(idempotencyKey)!;
      this.auditService.log({
        case_id: params.case_id,
        transaction_id: params.transaction_id,
        agent: 'RecoveryExecutor',
        event: 'IDEMPOTENCY_INTERCEPT',
        decision: params.action,
        action: params.action,
        previous_state: 'EXECUTING',
        new_state: 'EXECUTING',
        reason: `Duplicate execution intercepted via idempotency key: ${idempotencyKey}`,
        result: cached.simulated_response,
        model_version: 'recovery-model-v1'
      });
      return cached;
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 2. Dispatch to Test-Mode Gateway Adapter based on action
    let simResponse: any = {};
    let status: ExecutionResult['status'] = 'SUCCESS';
    let gatewayRef = '';
    let paymentLinkUrl = '';

    try {
      switch (params.action) {
        case 'RETRY_PAYMENT': {
          const res = await this.adapter.retryPayment({
            transaction_id: params.transaction_id,
            amount: params.amount,
            currency: params.currency || 'INR',
            payment_method: params.payment_method || 'UPI',
            customer_id: params.customer_id,
            recovery_probability: params.recovery_probability,
            root_cause: params.root_cause
          });
          simResponse = res;
          gatewayRef = res.payment_id || '';
          status = res.success ? 'SUCCESS' : 'FAILED';
          break;
        }

        case 'GENERATE_PAYMENT_LINK': {
          const res = await this.adapter.generatePaymentLink({
            transaction_id: params.transaction_id,
            amount: params.amount,
            customer_name: params.customer_name,
            customer_email: params.customer_email,
            customer_phone: params.customer_phone,
            description: `Payment Link for Transaction ${params.transaction_id}`
          });
          simResponse = res;
          paymentLinkUrl = res.short_url || '';
          gatewayRef = res.payment_link_id || '';
          status = 'SUCCESS';
          break;
        }

        case 'SEND_PAYMENT_REMINDER': {
          const res = await this.adapter.sendPaymentReminder({
            transaction_id: params.transaction_id,
            amount: params.amount,
            channel: 'WHATSAPP',
            customer_name: params.customer_name,
            customer_contact: params.customer_phone || params.customer_email
          });
          simResponse = res;
          status = 'SUCCESS';
          break;
        }

        case 'SUGGEST_ALTERNATE_METHOD': {
          const linkRes = await this.adapter.generatePaymentLink({
            transaction_id: params.transaction_id,
            amount: params.amount,
            customer_name: params.customer_name,
            description: `Switch payment method for ${params.transaction_id}`
          });
          simResponse = {
            ...linkRes,
            suggested_methods: ['UPI_INTENT', 'NETBANKING_HDFC', 'NETBANKING_ICICI', 'CARDS_VISA']
          };
          paymentLinkUrl = linkRes.short_url || '';
          status = 'SUCCESS';
          break;
        }

        case 'HUMAN_ESCALATION': {
          status = 'ESCALATED';
          simResponse = {
            escalation_id: `esc_${Date.now()}`,
            case_id: params.case_id,
            priority: params.amount > 5000 ? 'HIGH' : 'MEDIUM',
            desk: 'Revenue Recovery Specialist Team',
            assigned_at: now
          };
          break;
        }

        case 'NO_ACTION': {
          status = 'SUCCESS';
          simResponse = {
            info: 'No automated action required by policy.',
            skipped_at: now
          };
          break;
        }

        default: {
          status = 'BLOCKED';
          simResponse = {
            error: `Unsupported recovery action: ${params.action}`
          };
        }
      }
    } catch (err: any) {
      status = 'FAILED';
      simResponse = {
        error: err.message || 'Execution error in test gateway adapter'
      };
    }

    const result: ExecutionResult = {
      execution_id: executionId,
      case_id: params.case_id,
      transaction_id: params.transaction_id,
      action: params.action,
      status,
      test_mode: true,
      gateway_reference: gatewayRef,
      payment_link_url: paymentLinkUrl,
      simulated_response: simResponse,
      executed_at: now,
      error_message: status === 'FAILED' ? simResponse.failure_reason || simResponse.error : undefined
    };

    // Store in idempotency cache
    this.idempotencyStore.set(idempotencyKey, result);

    // Save action record to database memory store
    const actionRecordId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    memoryStore.recoveryActions.set(actionRecordId, {
      id: actionRecordId,
      case_id: params.case_id,
      action_type: params.action,
      status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'EXECUTED',
      trigger_channel: params.action === 'SEND_PAYMENT_REMINDER' ? 'WHATSAPP' : 'RAZORPAY_TEST_GATEWAY',
      payload_snapshot: simResponse,
      result_response: JSON.stringify(simResponse),
      scheduled_for: now,
      executed_at: now,
      created_at: now
    });

    return result;
  }

  /**
   * Reset idempotency cache (useful for testing)
   */
  public resetIdempotency(): void {
    this.idempotencyStore.clear();
  }
}
