import { RazorpayClient } from './client.js';
import {
  CreatePaymentLinkParams,
  RazorpayPaymentEntity,
  RazorpayPaymentLinkEntity,
  RazorpayApiResponse
} from './types.js';

/**
 * Razorpay Payment Operations Service
 * Handles test-mode payment inquiries, link generations, and captures.
 * Aligned with official Razorpay API specifications:
 * - GET /v1/payments/:id
 * - POST /v1/payments/:id/capture
 * - POST /v1/payment_links
 * - POST /v1/payments/:id/refund
 */
export class RazorpayPaymentService {
  private client: RazorpayClient;

  constructor(client: RazorpayClient = RazorpayClient.getInstance()) {
    this.client = client;
  }

  /**
   * Fetch payment details by Razorpay Payment ID
   */
  public async getPayment(paymentId: string): Promise<RazorpayApiResponse<RazorpayPaymentEntity>> {
    if (!paymentId || !paymentId.trim()) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Payment ID is mandatory'
        }
      };
    }
    return this.client.request<RazorpayPaymentEntity>('GET', `/payments/${encodeURIComponent(paymentId)}`);
  }

  /**
   * Generate a Razorpay Payment Link for dunning and recovery
   * Official schema: POST /v1/payment_links
   */
  public async createPaymentLink(
    params: CreatePaymentLinkParams
  ): Promise<RazorpayApiResponse<RazorpayPaymentLinkEntity>> {
    const amountInPaise = Math.round(params.amount * 100);

    const payload = {
      amount: amountInPaise,
      currency: params.currency || 'INR',
      accept_partial: false,
      description: params.description || `RecoverAI Payment Link for Transaction ${params.transactionId || ''}`,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact
      },
      notify: {
        sms: Boolean(params.customer.contact),
        email: Boolean(params.customer.email),
        whatsapp: Boolean(params.customer.contact)
      },
      reminder_enable: true,
      notes: {
        recoverai_case_id: params.caseId || 'manual',
        recoverai_txn_id: params.transactionId || 'manual',
        source: 'RecoverAI-Automated-Recovery'
      },
      ...(params.expireByMinutes
        ? { expire_by: Math.floor(Date.now() / 1000) + params.expireByMinutes * 60 }
        : {})
    };

    return this.client.request<RazorpayPaymentLinkEntity>('POST', '/payment_links', payload);
  }

  /**
   * Capture an authorized payment
   * Official schema: POST /v1/payments/:id/capture
   */
  public async capturePayment(
    paymentId: string,
    amountInPaise: number,
    currency = 'INR'
  ): Promise<RazorpayApiResponse<RazorpayPaymentEntity>> {
    return this.client.request<RazorpayPaymentEntity>(
      'POST',
      `/payments/${encodeURIComponent(paymentId)}/capture`,
      {
        amount: amountInPaise,
        currency
      }
    );
  }

  /**
   * Process full or partial refund
   * Official schema: POST /v1/payments/:id/refund
   */
  public async createRefund(
    paymentId: string,
    amountInPaise?: number,
    notes?: Record<string, string>
  ): Promise<RazorpayApiResponse<any>> {
    return this.client.request(
      'POST',
      `/payments/${encodeURIComponent(paymentId)}/refund`,
      {
        ...(amountInPaise ? { amount: amountInPaise } : {}),
        notes: notes || { source: 'RecoverAI-Recovery-Refund' }
      }
    );
  }
}
