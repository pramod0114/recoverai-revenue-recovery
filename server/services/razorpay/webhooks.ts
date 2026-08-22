import crypto from 'crypto';
import { memoryStore } from '../../db/connection.js';
import { RecoveryAgent } from '../../agent/RecoveryAgent.js';
import { AuditService } from '../../agent/AuditService.js';
import {
  RazorpayWebhookPayload,
  WebhookEventRecord,
  RazorpayWebhookEventType
} from './types.js';

export interface WebhookProcessResult {
  success: boolean;
  event_id: string;
  event_type: string;
  is_duplicate: boolean;
  status: 'PROCESSED' | 'DUPLICATE_SKIPPED' | 'FAILED' | 'IGNORED';
  message: string;
  case_id?: string;
  action_taken?: string;
  amount_inr?: number;
}

/**
 * Razorpay Webhook Management Service
 * Implements HMAC SHA256 signature verification, strict timing-safe comparison,
 * event deduplication, idempotency locking, and dispatch to RecoverAI recovery pipeline.
 */
export class RazorpayWebhookService {
  private static instance: RazorpayWebhookService;

  private constructor() {}

  public static getInstance(): RazorpayWebhookService {
    if (!RazorpayWebhookService.instance) {
      RazorpayWebhookService.instance = new RazorpayWebhookService();
    }
    return RazorpayWebhookService.instance;
  }

  /**
   * Verify Razorpay Webhook HMAC SHA256 Signature using timingSafeEqual
   * Official doc: crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
   */
  public verifySignature(
    rawBody: string | Buffer,
    signature: string | undefined,
    secret: string
  ): boolean {
    if (!signature || !secret || !rawBody) {
      return false;
    }

    try {
      const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(bodyString)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (err) {
      console.error('[Razorpay Webhook] Signature verification error:', err);
      return false;
    }
  }

  /**
   * Generates a deterministic SHA256 hash of the payload for tamper detection & idempotency
   */
  public calculatePayloadHash(rawBody: string | Buffer): string {
    const content = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Process incoming verified Razorpay webhook payload
   */
  public async processEvent(
    payload: RazorpayWebhookPayload,
    rawBody: string,
    providedEventId?: string
  ): Promise<WebhookProcessResult> {
    const payloadHash = this.calculatePayloadHash(rawBody);
    
    // Extract unique event ID from payload or fallback to generated deterministic hash
    const paymentEntity = payload.payload?.payment?.entity;
    const paymentLinkEntity = payload.payload?.payment_link?.entity;
    
    const eventId =
      providedEventId ||
      `evt_${payload.event.replace(/\./g, '_')}_${paymentEntity?.id || paymentLinkEntity?.id || payload.created_at || Date.now()}`;

    const eventType = payload.event;
    const receivedAt = new Date().toISOString();

    // 1. Idempotency Check — Check if event was already recorded or processed
    const existingEvents = (memoryStore as any).webhookEvents as Map<string, WebhookEventRecord> || new Map();
    if (existingEvents.has(eventId)) {
      const existing = existingEvents.get(eventId)!;
      return {
        success: true,
        event_id: eventId,
        event_type: eventType,
        is_duplicate: true,
        status: 'DUPLICATE_SKIPPED',
        message: 'Webhook event was already processed previously (Idempotent replay)',
        case_id: existing.case_id,
        amount_inr: existing.amount_inr
      };
    }

    // Also check by payload hash to prevent identical re-posts with different headers
    for (const record of existingEvents.values()) {
      if (record.payload_hash === payloadHash && record.processing_status === 'PROCESSED') {
        return {
          success: true,
          event_id: record.event_id,
          event_type: eventType,
          is_duplicate: true,
          status: 'DUPLICATE_SKIPPED',
          message: 'Identical payload already processed under event ID ' + record.event_id,
          case_id: record.case_id,
          amount_inr: record.amount_inr
        };
      }
    }

    // 2. Initialize Webhook Record
    const webhookRecord: WebhookEventRecord = {
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      account_id: payload.account_id || 'acc_test_recoverai',
      received_at: receivedAt,
      processed_at: null,
      processing_status: 'RECEIVED',
      error_message: null,
      raw_payload: rawBody
    };

    if (!(memoryStore as any).webhookEvents) {
      (memoryStore as any).webhookEvents = new Map<string, WebhookEventRecord>();
    }
    (memoryStore as any).webhookEvents.set(eventId, webhookRecord);

    const auditService = AuditService.getInstance();
    const recoveryAgent = RecoveryAgent.getInstance();

    try {
      // 3. Handle specific event types
      if (eventType === 'payment.failed') {
        if (!paymentEntity) {
          throw new Error('Malformed payment.failed event: missing payment entity');
        }

        const amountInInr = Math.round(paymentEntity.amount / 100);
        const transactionId = paymentEntity.id;
        const customerEmail = paymentEntity.email || 'customer@example.com';
        const customerContact = paymentEntity.contact || '+919876543210';
        const failureReason =
          paymentEntity.error_description ||
          paymentEntity.error_reason ||
          'Payment declined by issuing bank';
        const failureCode = paymentEntity.error_code || 'BAD_REQUEST_ERROR';

        // Upsert payment into memoryStore
        const paymentId = `pmt_${transactionId}`;
        const existingPayment = memoryStore.payments.get(paymentId);
        const currentRetries = existingPayment ? existingPayment.retry_count + 1 : 0;

        const paymentRecord = {
          id: paymentId,
          transaction_id: transactionId,
          merchant_id: 'mer_enterprise_01',
          customer_id: `cust_${customerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          customer_name: (paymentEntity.notes as any)?.customer_name || 'Customer ' + customerEmail.split('@')[0],
          customer_email: customerEmail,
          customer_phone: customerContact,
          subscription_id: paymentEntity.invoice_id || null,
          invoice_id: paymentEntity.invoice_id || null,
          amount: amountInInr,
          currency: paymentEntity.currency || 'INR',
          payment_method: (paymentEntity.method || 'upi').toUpperCase(),
          payment_status: 'FAILED',
          failure_code: failureCode,
          failure_reason: failureReason,
          failure_category: this.mapFailureCategory(failureReason, failureCode),
          retry_count: currentRetries,
          checkout_status: 'DROPPED',
          recovery_status: 'AT_RISK',
          recovered_amount: 0,
          customer_age_days: 120,
          previous_successful_payments: 4,
          previous_failed_payments: 1,
          previous_total_spend: amountInInr * 3,
          created_at: new Date(
            paymentEntity.created_at
              ? (paymentEntity.created_at > 100000000000 ? paymentEntity.created_at : paymentEntity.created_at * 1000)
              : Date.now()
          ).toISOString(),
          updated_at: new Date().toISOString()
        };

        memoryStore.payments.set(paymentId, paymentRecord as any);

        // High-Value Transaction Rule Check (Guardrail)
        // If amount >= ₹50,000 (or configured max threshold), flag for Human Escalation instead of automated trigger
        const isHighValue = amountInInr >= (memoryStore.policyConfig.max_amount_for_auto_retry || 50000);

        // Run RecoverAI End-to-End Workflow
        const caseId = `case_${transactionId}`;
        const workflowResult = await recoveryAgent.runEndToEndWorkflow({
          case_id: caseId,
          transaction_id: transactionId,
          amount: amountInInr,
          payment_method: paymentRecord.payment_method,
          failure_reason: failureReason,
          retry_count: currentRetries,
          customer_email: customerEmail,
          customer_phone: customerContact,
          customer_name: paymentRecord.customer_name,
          risk_score: isHighValue ? 0.85 : 0.25,
          recovery_probability: isHighValue ? 0.65 : 0.82
        });

        // Record in Webhook Event table
        webhookRecord.case_id = caseId;
        webhookRecord.payment_id = transactionId;
        webhookRecord.amount_inr = amountInInr;
        webhookRecord.processing_status = 'PROCESSED';
        webhookRecord.processed_at = new Date().toISOString();

        auditService.log({
          case_id: caseId,
          transaction_id: transactionId,
          agent: 'RazorpayWebhookService',
          event: 'WEBHOOK_EVENT_PROCESSED',
          decision: workflowResult.decision?.recommended_action || 'ANALYZE',
          action: workflowResult.decision?.recommended_action || 'NO_ACTION',
          previous_state: 'DETECTED',
          new_state: (workflowResult.workflow_state as any) || 'ANALYZING',
          reason: `Ingested Razorpay test event ${eventType} for ${transactionId} (₹${amountInInr.toLocaleString()})`,
          result: {
            event_id: eventId,
            event_type: eventType,
            amount: amountInInr,
            decision: workflowResult.decision?.recommended_action,
            is_high_value: isHighValue
          },
          model_version: 'recovery-model-v1'
        });

        return {
          success: true,
          event_id: eventId,
          event_type: eventType,
          is_duplicate: false,
          status: 'PROCESSED',
          message: `Payment failure processed and recovery workflow initiated`,
          case_id: caseId,
          action_taken: workflowResult.decision?.recommended_action || 'ANALYSIS_COMPLETED',
          amount_inr: amountInInr
        };
      }

      if (eventType === 'payment.captured' || eventType === 'payment_link.paid' || eventType === 'order.paid') {
        const payId = paymentEntity?.id || paymentLinkEntity?.id || 'unknown';
        const amountInInr = Math.round((paymentEntity?.amount || paymentLinkEntity?.amount || 0) / 100);
        
        // Find corresponding case if any
        let matchedCase: any = null;
        for (const c of memoryStore.recoveryCases.values()) {
          if (c.transaction_id === payId || (c as any).payment_id === `pmt_${payId}` || c.id.includes(payId)) {
            matchedCase = c;
            break;
          }
        }

        if (matchedCase) {
          matchedCase.status = 'RECOVERED';
          matchedCase.recovered_amount = amountInInr || matchedCase.at_risk_amount;
          matchedCase.recovered_at = new Date().toISOString();
          matchedCase.workflow_state = 'CLOSED';
        }

        // Update payment status
        const pmtRecord = memoryStore.payments.get(`pmt_${payId}`);
        if (pmtRecord) {
          pmtRecord.payment_status = 'RECOVERED';
          pmtRecord.recovery_status = 'RECOVERED';
          pmtRecord.recovered_amount = amountInInr || pmtRecord.amount;
        }

        webhookRecord.case_id = matchedCase?.id;
        webhookRecord.payment_id = payId;
        webhookRecord.amount_inr = amountInInr;
        webhookRecord.processing_status = 'PROCESSED';
        webhookRecord.processed_at = new Date().toISOString();

        auditService.log({
          case_id: matchedCase?.id || `case_${payId}`,
          transaction_id: payId,
          agent: 'RazorpayWebhookService',
          event: 'PAYMENT_CONFIRMED_RECOVERED',
          decision: 'MARK_RECOVERED',
          action: 'MARK_RECOVERED',
          previous_state: 'IN_PROGRESS' as any,
          new_state: 'RECOVERED',
          reason: `Gateway confirmed payment success via ${eventType} for ${payId}`,
          result: {
            event_id: eventId,
            event_type: eventType,
            recovered_amount: amountInInr
          },
          model_version: 'recovery-model-v1'
        });

        return {
          success: true,
          event_id: eventId,
          event_type: eventType,
          is_duplicate: false,
          status: 'PROCESSED',
          message: `Payment recovery verified and settled successfully`,
          case_id: matchedCase?.id,
          action_taken: 'STATUS_RECOVERED_CONFIRMED',
          amount_inr: amountInInr
        };
      }

      // Default acknowledgement for other supported events
      webhookRecord.processing_status = 'PROCESSED';
      webhookRecord.processed_at = new Date().toISOString();

      return {
        success: true,
        event_id: eventId,
        event_type: eventType,
        is_duplicate: false,
        status: 'PROCESSED',
        message: `Webhook event acknowledged and recorded`
      };
    } catch (err: any) {
      webhookRecord.processing_status = 'FAILED';
      webhookRecord.error_message = err.message;
      webhookRecord.processed_at = new Date().toISOString();

      console.error(`[Razorpay Webhook Error] Failed to process ${eventId}:`, err);
      return {
        success: false,
        event_id: eventId,
        event_type: eventType,
        is_duplicate: false,
        status: 'FAILED',
        message: `Processing failure: ${err.message}`
      };
    }
  }

  private mapFailureCategory(reason: string, code: string): string {
    const text = (reason + ' ' + code).toLowerCase();
    if (text.includes('insufficient') || text.includes('balance')) return 'INSUFFICIENT_FUNDS';
    if (text.includes('expired')) return 'EXPIRED_CARD';
    if (text.includes('otp') || text.includes('auth') || text.includes('3d')) return 'AUTHENTICATION_DROP';
    if (text.includes('network') || text.includes('timeout') || text.includes('gateway')) return 'BANK_DOWNTIME';
    if (text.includes('fraud') || text.includes('risk')) return 'FRAUD_SUSPICION';
    if (text.includes('limit')) return 'LIMIT_EXCEEDED';
    return 'GATEWAY_ERROR';
  }
}
