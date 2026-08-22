import https from 'https';
import http from 'http';
import { RazorpayConfig, RazorpayApiResponse } from './types.js';

/**
 * Razorpay Test-Mode Client
 * Encapsulates official Razorpay REST API communications
 * Uses HTTP Basic Authentication with Key ID and Key Secret
 * Reference: https://razorpay.com/docs/api/
 */
export class RazorpayClient {
  private static instance: RazorpayClient;
  private config: RazorpayConfig;

  private constructor() {
    this.config = {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_recoverai_sandbox',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_sec_recoverai_sandbox_key',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_recoverai_super_secret_2026',
      simulationMode: process.env.SIMULATION_MODE !== 'false',
      baseUrl: 'https://api.razorpay.com/v1'
    };
  }

  public static getInstance(): RazorpayClient {
    if (!RazorpayClient.instance) {
      RazorpayClient.instance = new RazorpayClient();
    }
    return RazorpayClient.instance;
  }

  public updateConfig(newConfig: Partial<RazorpayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): Readonly<RazorpayConfig> {
    return {
      ...this.config,
      // Never expose real secrets in logs/config exports
      keySecret: this.config.keySecret ? '********' : '',
      webhookSecret: this.config.webhookSecret ? '********' : ''
    };
  }

  public isSimulationMode(): boolean {
    // If explicitly configured, or if test credentials are sandbox placeholders
    if (this.config.simulationMode) return true;
    if (!this.config.keyId || this.config.keyId.includes('sandbox')) return true;
    return false;
  }

  public getWebhookSecret(): string {
    return this.config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_recoverai_super_secret_2026';
  }

  /**
   * Execute authenticated HTTP Basic request against Razorpay API
   */
  public async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, any>
  ): Promise<RazorpayApiResponse<T>> {
    if (this.isSimulationMode()) {
      return {
        success: true,
        is_simulation: true,
        data: this.getSimulatedResponse<T>(method, endpoint, data)
      };
    }

    const authHeader = 'Basic ' + Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    const postData = data ? JSON.stringify(data) : undefined;

    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'RecoverAI-Engine/1.0',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        },
        timeout: 8000 // 8-second bounded timeout for resilient fallback
      };

      const req = https.request(options, (res) => {
        let rawBody = '';
        res.on('data', (chunk) => {
          rawBody += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawBody);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                success: true,
                is_simulation: false,
                data: parsed
              });
            } else {
              resolve({
                success: false,
                is_simulation: false,
                error: parsed.error || {
                  code: `HTTP_${res.statusCode}`,
                  description: parsed.description || 'Razorpay Gateway Request Failed'
                }
              });
            }
          } catch (err: any) {
            resolve({
              success: false,
              is_simulation: false,
              error: {
                code: 'INVALID_JSON_RESPONSE',
                description: `Failed to parse gateway response: ${err.message}`
              }
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          is_simulation: false,
          error: {
            code: 'GATEWAY_TIMEOUT',
            description: 'Razorpay API request timed out after 8000ms'
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          is_simulation: false,
          error: {
            code: 'NETWORK_ERROR',
            description: err.message || 'Unable to connect to Razorpay API gateway'
          }
        });
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * Generates realistic simulated responses matching official Razorpay schema
   */
  private getSimulatedResponse<T = any>(
    method: string,
    endpoint: string,
    body?: Record<string, any>
  ): T {
    const now = Math.floor(Date.now() / 1000);

    if (endpoint.startsWith('/payments/') && endpoint.includes('/capture')) {
      const payId = endpoint.split('/')[2];
      return {
        id: payId,
        entity: 'payment',
        amount: body?.amount || 250000,
        currency: body?.currency || 'INR',
        status: 'captured',
        captured: true,
        method: 'upi',
        description: 'Simulated Razorpay test capture',
        fee: 5000,
        tax: 900,
        created_at: now
      } as unknown as T;
    }

    if (endpoint.startsWith('/payment_links')) {
      const linkId = `plink_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const shortUrl = `https://rzp.io/i/test_${Math.random().toString(36).substring(2, 8)}`;
      return {
        id: linkId,
        entity: 'payment_link',
        amount: body?.amount || 250000,
        currency: body?.currency || 'INR',
        accept_partial: false,
        short_url: shortUrl,
        status: 'created',
        description: body?.description || 'RecoverAI Payment Link',
        customer: body?.customer || { name: 'Customer', email: 'test@example.com' },
        notify: body?.notify || { sms: true, email: true, whatsapp: true },
        created_at: now
      } as unknown as T;
    }

    if (endpoint.startsWith('/payments/')) {
      const payId = endpoint.split('/')[2];
      return {
        id: payId,
        entity: 'payment',
        amount: 350000,
        currency: 'INR',
        status: 'failed',
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Payment failed due to insufficient funds in bank account.',
        error_source: 'bank',
        error_step: 'payment_authorization',
        error_reason: 'insufficient_funds',
        created_at: now
      } as unknown as T;
    }

    return {
      id: `rzp_${Math.random().toString(36).substring(2, 8)}`,
      entity: 'generic_response',
      status: 'simulated_success',
      created_at: now
    } as unknown as T;
  }
}
