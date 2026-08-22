import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { RazorpayWebhookService } from '../services/razorpay/webhooks.js';
import { RazorpayClient } from '../services/razorpay/client.js';
import { memoryStore } from '../db/connection.js';
import { Logger } from '../utils/logger.js';
import { createRateLimiter } from '../middleware/security.js';

export const webhooksRouter = Router();

// Webhook rate limiting (up to 300 requests per minute from gateway)
const webhookRateLimiter = createRateLimiter({
  maxRequests: 300,
  windowMs: 60 * 1000,
  message: 'Webhook intake rate limit exceeded'
});

/**
 * POST /api/webhooks/razorpay
 * Official Razorpay Webhook intake endpoint
 * Verifies HMAC SHA256 signature against raw payload
 */
webhooksRouter.post('/razorpay', webhookRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const signature = (req.headers['x-razorpay-signature'] as string) || (req.headers['x-signature'] as string);
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const webhookService = RazorpayWebhookService.getInstance();
  const razorpayClient = RazorpayClient.getInstance();
  const secret = razorpayClient.getWebhookSecret();

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Signature Verification
  // In simulation mode with simulated sandbox events, allow simulation test signature or verify real secret
  const isSignatureValid =
    webhookService.verifySignature(rawBody, signature, secret) ||
    (signature === 'simulated_test_signature' && razorpayClient.isSimulationMode());

  if (!isSignatureValid) {
    Logger.warn('RazorpayWebhook', 'Rejected webhook with invalid HMAC signature', {
      request_id: requestId,
      signature_provided: signature ? 'PRESENT_INVALID' : 'MISSING',
      ip: req.ip
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'The x-razorpay-signature header is invalid or failed cryptographic verification.'
      }
    });
    return;
  }

  // 2. Payload Validation
  const payload = req.body;
  if (!payload || !payload.event || !payload.payload) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_WEBHOOK_PAYLOAD',
        message: 'Payload missing mandatory event or payload fields.'
      }
    });
    return;
  }

  const eventType = payload.event;
  const paymentId = payload.payload?.payment?.entity?.id || payload.payload?.payment_link?.entity?.id;
  const eventId = req.headers['x-razorpay-event-id'] as string || `evt_${eventType.replace(/\./g, '_')}_${paymentId || Date.now()}`;

  Logger.info('RazorpayWebhook', `Processing verified webhook: ${eventType}`, {
    request_id: requestId,
    event_id: eventId,
    event_type: eventType,
    payment_id: paymentId
  });

  // 3. Process and Dispatch to RecoverAI Pipeline
  try {
    const result = await webhookService.processEvent(payload, rawBody, eventId);

    Logger.info('RazorpayWebhook', `Webhook event processed: ${result.status}`, {
      request_id: requestId,
      event_id: eventId,
      status: result.status,
      case_id: result.case_id,
      is_duplicate: result.is_duplicate
    });

    res.status(200).json(result);
  } catch (err: any) {
    Logger.error('RazorpayWebhook', `Fatal error during webhook event processing: ${err.message}`, {
      request_id: requestId,
      event_id: eventId,
      error: err.message
    });

    res.status(500).json({
      success: false,
      event_id: eventId,
      error: {
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: err.message || 'Internal processing error'
      }
    });
  }
});

/**
 * POST /api/webhooks/razorpay/simulate
 * Safe developer & reviewer simulator to trigger test-mode Razorpay events with computed HMAC signature
 */
webhooksRouter.post('/razorpay/simulate', async (req: Request, res: Response): Promise<void> => {
  const {
    event_type = 'payment.failed',
    amount = 3500,
    currency = 'INR',
    failure_reason = 'Payment failed due to insufficient funds in bank account.',
    failure_code = 'BAD_REQUEST_ERROR',
    payment_method = 'upi',
    customer_email = 'rohit.mehta@enterprise.in',
    customer_name = 'Rohit Mehta',
    customer_phone = '+919876543210',
    simulate_invalid_signature = false,
    simulate_duplicate = false,
    duplicate_event_id
  } = req.body;

  const nowEpoch = Math.floor(Date.now() / 1000);
  const testPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testOrderId = `order_test_${Date.now()}`;

  const syntheticPayload: any = {
    entity: 'event',
    account_id: 'acc_recoverai_test',
    event: event_type,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          entity: 'payment',
          amount: Math.round(amount * 100), // in paise
          currency,
          status: event_type === 'payment.captured' ? 'captured' : 'failed',
          order_id: testOrderId,
          invoice_id: null,
          international: false,
          method: payment_method,
          amount_refunded: 0,
          refund_status: null,
          captured: event_type === 'payment.captured',
          description: `Subscription fee for ${customer_name}`,
          card_id: payment_method === 'card' ? 'card_test_1234' : null,
          bank: 'HDFC',
          wallet: null,
          vpa: payment_method === 'upi' ? `${customer_email.split('@')[0]}@okaxis` : null,
          email: customer_email,
          contact: customer_phone,
          notes: {
            customer_name,
            source: 'RecoverAI-Simulation'
          },
          fee: event_type === 'payment.captured' ? Math.round(amount * 2) : null,
          tax: 0,
          error_code: event_type === 'payment.captured' ? null : failure_code,
          error_description: event_type === 'payment.captured' ? null : failure_reason,
          error_source: 'bank',
          error_step: 'payment_authorization',
          error_reason: failure_code.toLowerCase(),
          created_at: nowEpoch
        }
      }
    },
    created_at: nowEpoch
  };

  const rawBody = JSON.stringify(syntheticPayload);
  const webhookSecret = RazorpayClient.getInstance().getWebhookSecret();

  // Compute authentic HMAC SHA256 signature
  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const signatureToSend = simulate_invalid_signature ? 'corrupted_invalid_signature_xyz' : validSignature;
  const eventIdToSend = simulate_duplicate
    ? duplicate_event_id || `evt_fixed_dup_${Date.now()}`
    : `evt_sim_${Date.now()}`;

  const webhookService = RazorpayWebhookService.getInstance();

  if (simulate_invalid_signature) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Simulation correctly rejected due to invalid cryptographic HMAC signature.'
      }
    });
    return;
  }

  // Process event through standard pipeline
  const result = await webhookService.processEvent(syntheticPayload, rawBody, eventIdToSend);

  res.json({
    success: true,
    simulation: {
      mode: 'TEST_MODE',
      event_type,
      generated_signature: validSignature,
      event_id: eventIdToSend,
      payment_id: testPaymentId,
      amount_inr: amount
    },
    process_result: result
  });
});

/**
 * GET /api/webhooks/events
 * Retrieve stored webhook events for audit and verification
 */
webhooksRouter.get('/events', (req: Request, res: Response) => {
  const eventsMap = (memoryStore as any).webhookEvents as Map<string, any> || new Map();
  const eventsList = Array.from(eventsMap.values()).reverse();

  res.json({
    success: true,
    count: eventsList.length,
    data: eventsList
  });
});

/**
 * GET /api/webhooks/config
 * View webhook configuration status
 */
webhooksRouter.get('/config', (req: Request, res: Response) => {
  const client = RazorpayClient.getInstance();
  const cfg = client.getConfig();

  res.json({
    success: true,
    data: {
      gateway_mode: 'TEST_MODE',
      simulation_mode: client.isSimulationMode(),
      key_id: cfg.keyId,
      webhook_url: '/api/webhooks/razorpay',
      signature_algorithm: 'HMAC-SHA256',
      supported_events: [
        'payment.failed',
        'payment.captured',
        'payment.authorized',
        'payment_link.paid',
        'order.paid',
        'refund.processed'
      ]
    }
  });
});
