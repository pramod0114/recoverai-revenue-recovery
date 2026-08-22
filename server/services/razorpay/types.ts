/**
 * Razorpay Test-Mode Integration Types
 * Strictly aligned with official Razorpay API specifications
 * Reference: https://razorpay.com/docs/api/
 */

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  simulationMode: boolean;
  baseUrl?: string;
}

export type RazorpayWebhookEventType =
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.pending'
  | 'payment_link.created'
  | 'payment_link.paid'
  | 'payment_link.cancelled'
  | 'payment_link.expired'
  | 'order.paid'
  | 'refund.processed'
  | 'refund.failed'
  | 'subscription.charged'
  | 'subscription.halted';

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number; // in paise (e.g. 10000 = ₹100.00)
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  invoice_id: string | null;
  international: boolean;
  method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi' | 'bank_transfer' | string;
  amount_refunded: number;
  refund_status: 'null' | 'partial' | 'full' | null;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string | null;
  contact: string | null;
  notes: Record<string, string> | any[];
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data?: {
    bank_transaction_id?: string;
    auth_code?: string;
    rrn?: string;
    upi_transaction_id?: string;
  };
  created_at: number; // Unix epoch seconds
}

export interface RazorpayPaymentLinkEntity {
  id: string;
  entity: 'payment_link';
  amount: number; // in paise
  currency: string;
  accept_partial: boolean;
  short_url: string;
  status: 'created' | 'partially_paid' | 'paid' | 'cancelled' | 'expired';
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notify: {
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: RazorpayWebhookEventType;
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity;
    };
    payment_link?: {
      entity: RazorpayPaymentLinkEntity;
    };
    order?: {
      entity: any;
    };
    refund?: {
      entity: any;
    };
  };
  created_at: number;
}

export interface WebhookEventRecord {
  event_id: string;
  event_type: string;
  payload_hash: string;
  account_id: string;
  received_at: string;
  processed_at: string | null;
  processing_status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE_SKIPPED';
  error_message: string | null;
  case_id?: string;
  payment_id?: string;
  amount_inr?: number;
  raw_payload?: string;
}

export interface CreatePaymentLinkParams {
  amount: number; // in Rupees
  currency?: string;
  description: string;
  customer: {
    name: string;
    email?: string;
    contact?: string;
  };
  caseId?: string;
  transactionId?: string;
  expireByMinutes?: number;
}

export interface RazorpayApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
  };
  is_simulation?: boolean;
}
