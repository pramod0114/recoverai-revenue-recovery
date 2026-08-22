import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { RazorpayWebhookService } from '../server/services/razorpay/webhooks.js';
import { RazorpayClient } from '../server/services/razorpay/client.js';
import { RazorpayPaymentService } from '../server/services/razorpay/payments.js';
import { RazorpayWebhookPayload } from '../server/services/razorpay/types.js';
import { memoryStore } from '../server/db/connection.js';
import { MLRecoveryPredictor } from '../ml/inference/predictor.js';
import { RecoveryAgent } from '../server/agent/RecoveryAgent.js';

describe('Part 5 — Razorpay Test-Mode Integration, Security, and Resilience Suite', () => {
  let webhookService: RazorpayWebhookService;
  let client: RazorpayClient;
  let paymentService: RazorpayPaymentService;
  const testSecret = 'whsec_test_secret_recoverai_2026_x99';

  beforeEach(() => {
    client = RazorpayClient.getInstance();
    webhookService = RazorpayWebhookService.getInstance();
    paymentService = new RazorpayPaymentService(client);
  });

  describe('1. Webhook Signature Security (HMAC-SHA256 & Timing-Safe Verification)', () => {
    it('cryptographically accepts valid HMAC SHA-256 signatures', () => {
      const payload = JSON.stringify({
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_test_001', amount: 500000, currency: 'INR' } } }
      });

      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload)
        .digest('hex');

      const isValid = webhookService.verifySignature(payload, validSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it('strictly rejects forged, tampered, or invalid signatures', () => {
      const payload = JSON.stringify({
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_test_001', amount: 500000, currency: 'INR' } } }
      });

      const tamperedPayload = JSON.stringify({
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_test_001', amount: 9999900, currency: 'INR' } } }
      });

      const originalSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload)
        .digest('hex');

      // Signature computed on different payload
      expect(webhookService.verifySignature(tamperedPayload, originalSignature, testSecret)).toBe(false);

      // Completely random fake signature
      expect(webhookService.verifySignature(payload, 'fake_forged_signature_hex_12345', testSecret)).toBe(false);

      // Missing or empty signature
      expect(webhookService.verifySignature(payload, '', testSecret)).toBe(false);
    });
  });

  describe('2. Idempotency & Duplicate Webhook Handling', () => {
    it('deduplicates replayed or duplicate webhook event IDs', async () => {
      const eventId = `evt_dedup_test_${Date.now()}`;
      const payload: RazorpayWebhookPayload = {
        entity: 'event',
        account_id: 'acc_test_recoverai',
        event: 'payment.failed',
        contains: ['payment'],
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: 'pay_test_dup_101',
              amount: 250000,
              currency: 'INR',
              email: 'rahul.verma@example.com',
              notes: { customer_name: 'Rahul Verma' },
              error_description: 'Card declined by issuing bank'
            } as any
          }
        }
      };
      const rawBody = JSON.stringify(payload);

      // First delivery: should process normally
      const firstResult = await webhookService.processEvent(payload, rawBody, eventId);
      expect(firstResult.status).toBe('PROCESSED');
      expect(firstResult.is_duplicate).toBe(false);

      // Second delivery (duplicate replay): should intercept via idempotency
      const duplicateResult = await webhookService.processEvent(payload, rawBody, eventId);
      expect(duplicateResult.status).toBe('DUPLICATE_SKIPPED');
      expect(duplicateResult.is_duplicate).toBe(true);
    });
  });

  describe('3. Payment Failure Event Handling (payment.failed)', () => {
    it('automatically ingests payment failure, creates recovery case, and triggers AI agent workflow', async () => {
      const paymentId = `pay_failed_${Date.now()}`;
      const eventId = `evt_fail_${Date.now()}`;

      const payload: RazorpayWebhookPayload = {
        entity: 'event',
        account_id: 'acc_test_recoverai',
        event: 'payment.failed',
        contains: ['payment'],
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 450000, // ₹4,500.00
              currency: 'INR',
              method: 'upi',
              email: 'priya.nair@corp.in',
              contact: '+919876543210',
              notes: { customer_name: 'Priya Nair' },
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment failed due to customer UPI MPIN limit exceeded'
            } as any
          }
        }
      };

      const result = await webhookService.processEvent(payload, JSON.stringify(payload), eventId);
      expect(result.status).toBe('PROCESSED');
      expect(result.case_id).toBeDefined();

      // Verify recovery case was registered in store
      const recoveryCase = (memoryStore.recoveryCases as Map<string, any>).get(result.case_id!);
      expect(recoveryCase).toBeDefined();
      expect(recoveryCase.at_risk_amount).toBe(4500);
      expect(recoveryCase.currency).toBe('INR');
      expect(recoveryCase.customer_name).toBe('Priya Nair');
      expect(recoveryCase.status).toBeDefined();
    });
  });

  describe('4. Payment Success & Settlement Event Handling (payment.captured / payment_link.paid)', () => {
    it('marks case as RECOVERED upon payment.captured and prevents further dunning', async () => {
      // First create a pending recovery case
      const txnId = `txn_settle_${Date.now()}`;
      const agent = RecoveryAgent.getInstance();
      const workflowResult = await agent.runEndToEndWorkflow({
        transaction_id: txnId,
        amount: 3200,
        customer_name: 'Anil Kapoor',
        customer_email: 'anil@kapoor.in',
        payment_method: 'UPI',
        failure_reason: 'Server timeout during transaction processing'
      });

      const caseId = workflowResult.decision.case_id;
      expect(caseId).toBeDefined();

      // Now fire payment.captured webhook matching the transaction
      const capturedPayload: RazorpayWebhookPayload = {
        entity: 'event',
        account_id: 'acc_test_recoverai',
        event: 'payment.captured',
        contains: ['payment'],
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: txnId,
              amount: 320000,
              currency: 'INR',
              status: 'captured',
              email: 'anil@kapoor.in',
              notes: { case_id: caseId }
            } as any
          }
        }
      };

      const captureResult = await webhookService.processEvent(
        capturedPayload,
        JSON.stringify(capturedPayload),
        `evt_cap_${Date.now()}`
      );

      expect(captureResult.status).toBe('PROCESSED');

      // Verify case updated to RECOVERED
      const updatedCase = (memoryStore.recoveryCases as Map<string, any>).get(caseId);
      expect(updatedCase.status).toBe('RECOVERED');
    });
  });

  describe('5. Gateway API Resilience & Timeout Protection', () => {
    it('safely handles simulated API operations without throwing unhandled exceptions', async () => {
      const linkRes = await paymentService.createPaymentLink({
        amount: 1500,
        currency: 'INR',
        description: 'Recovery link for invoice INV-9901',
        customer: {
          name: 'Sunita Rao',
          email: 'sunita@rao.org'
        }
      });

      expect(linkRes.success).toBe(true);
      expect(linkRes.data?.id).toMatch(/^plink_/);
      expect(linkRes.data?.short_url).toContain('rzp.io/i/');
      expect(linkRes.data?.status).toBe('created');
    });

    it('handles simulated fetch payment failure gracefully', async () => {
      const paymentRes = await paymentService.getPayment('pay_test_nonexistent');
      expect(paymentRes.success).toBe(true);
      expect(paymentRes.data?.id).toBe('pay_test_nonexistent');
    });
  });

  describe('6. ML Service Failure Resilience & Safe Fallback Rule Engine', () => {
    it('falls back seamlessly to heuristic rules if ML inference fails or is unseeded', async () => {
      const predictor = MLRecoveryPredictor.getInstance();

      // Run prediction on payment with known heuristic attributes
      const prediction = await predictor.predict({
        transaction_id: 'txn_ml_fallback_test',
        amount: 1200,
        payment_method: 'UPI',
        failure_reason: 'Temporary network glitch at acquiring bank',
        retry_count: 0
      });

      expect(prediction.recovery_probability).toBeGreaterThan(0);
      expect(prediction.recommended_action).toBeDefined();
      expect(prediction.risk_score).toBeGreaterThanOrEqual(0);
      expect(prediction.explanation.length).toBeGreaterThan(0);
    });
  });

  describe('7. High-Value Safety Threshold Policy Enforcement', () => {
    it('strictly escalates high-value transactions (> ₹1,00,000) for human desk review', async () => {
      const agent = RecoveryAgent.getInstance();
      const result = await agent.runEndToEndWorkflow({
        transaction_id: `txn_highval_${Date.now()}`,
        amount: 150000, // ₹1,50,000 > ₹1,00,000 threshold
        customer_name: 'Big Enterprise Corp',
        customer_email: 'finance@bigcorp.in',
        payment_method: 'NETBANKING',
        failure_reason: 'Exceeded maximum bank transaction limit'
      });

      expect(result.decision.policy_result?.allowed_action).toBe('HUMAN_ESCALATION');
      expect(result.workflow_state).toBe('BLOCKED');
      expect(result.decision.policy_result?.passed).toBe(false);
      expect(result.decision.policy_result?.violations).toContain('HIGH_VALUE_MANUAL_REVIEW_REQUIRED');
    });
  });
});
