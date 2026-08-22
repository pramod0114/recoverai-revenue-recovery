import { ControlledRecoveryAction } from './types.js';

export interface RazorpaySimulatedResponse {
  success: boolean;
  status: 'captured' | 'failed' | 'issued' | 'delivered';
  payment_id?: string;
  order_id?: string;
  payment_link_id?: string;
  short_url?: string;
  failure_code?: string;
  failure_reason?: string;
  mode: 'TEST';
  raw_gateway_payload: Record<string, any>;
}

export class RazorpayTestAdapter {
  private static instance: RazorpayTestAdapter;

  private constructor() {}

  public static getInstance(): RazorpayTestAdapter {
    if (!RazorpayTestAdapter.instance) {
      RazorpayTestAdapter.instance = new RazorpayTestAdapter();
    }
    return RazorpayTestAdapter.instance;
  }

  /**
   * Execute simulated test-mode payment retry
   */
  public async retryPayment(params: {
    transaction_id: string;
    amount: number;
    currency?: string;
    payment_method?: string;
    customer_id?: string;
    root_cause?: string;
    recovery_probability?: number;
  }): Promise<RazorpaySimulatedResponse> {
    const isHighProb = (params.recovery_probability ?? 0.8) >= 0.70;
    // In test mode: simulate high probability having ~85% success, transient network having higher chance
    const successChance = isHighProb ? 0.85 : 0.40;
    const isSuccessful = Math.random() < successChance;

    const testPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testOrderId = `order_test_${Date.now()}`;

    if (isSuccessful) {
      return {
        success: true,
        status: 'captured',
        payment_id: testPaymentId,
        order_id: testOrderId,
        mode: 'TEST',
        raw_gateway_payload: {
          id: testPaymentId,
          entity: 'payment',
          amount: Math.round(params.amount * 100),
          currency: params.currency || 'INR',
          status: 'captured',
          order_id: testOrderId,
          method: params.payment_method || 'upi',
          captured: true,
          description: `RecoverAI Automated Retry for ${params.transaction_id}`,
          fee: Math.round(params.amount * 2), // 2% gateway fee
          tax: 0,
          error_code: null,
          error_description: null,
          created_at: Math.floor(Date.now() / 1000)
        }
      };
    } else {
      return {
        success: false,
        status: 'failed',
        payment_id: testPaymentId,
        order_id: testOrderId,
        failure_code: 'BAD_REQUEST_ERROR',
        failure_reason: 'Simulated customer authentication expired or bank limit decline during retry',
        mode: 'TEST',
        raw_gateway_payload: {
          id: testPaymentId,
          entity: 'payment',
          amount: Math.round(params.amount * 100),
          currency: params.currency || 'INR',
          status: 'failed',
          order_id: testOrderId,
          error_code: 'GATEWAY_ERROR',
          error_description: 'Issuer bank rejected simulated re-attempt',
          error_source: 'bank',
          error_step: 'payment_authorization',
          error_reason: 'payment_failed',
          created_at: Math.floor(Date.now() / 1000)
        }
      };
    }
  }

  /**
   * Generate simulated Razorpay Payment Link (Invoices / SMS / WhatsApp link)
   */
  public async generatePaymentLink(params: {
    transaction_id: string;
    amount: number;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    description?: string;
  }): Promise<RazorpaySimulatedResponse> {
    const linkId = `plink_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const shortUrl = `https://rzp.io/i/test_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      status: 'issued',
      payment_link_id: linkId,
      short_url: shortUrl,
      mode: 'TEST',
      raw_gateway_payload: {
        id: linkId,
        entity: 'payment_link',
        amount: Math.round(params.amount * 100),
        currency: 'INR',
        accept_partial: false,
        short_url: shortUrl,
        customer: {
          name: params.customer_name || 'Valued Customer',
          email: params.customer_email || 'customer@example.com',
          contact: params.customer_phone || '+919876543210'
        },
        notify: {
          sms: true,
          email: true,
          whatsapp: true
        },
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      }
    };
  }

  /**
   * Send simulated smart reminder with direct checkout resumption token
   */
  public async sendPaymentReminder(params: {
    transaction_id: string;
    amount: number;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
    customer_name?: string;
    customer_contact?: string;
  }): Promise<RazorpaySimulatedResponse> {
    return {
      success: true,
      status: 'delivered',
      mode: 'TEST',
      raw_gateway_payload: {
        notification_id: `notif_${Date.now()}`,
        channel: params.channel,
        recipient: params.customer_contact || '+919876543210',
        template: 'payment_recovery_prompt_v1',
        status: 'delivered',
        dispatched_at: new Date().toISOString()
      }
    };
  }
}
