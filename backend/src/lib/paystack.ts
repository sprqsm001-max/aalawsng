import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface InitializePaymentParams {
  email: string;
  amount: number; // in lowest currency unit: Kobo for NGN, Cents for USD
  currency?: 'NGN' | 'USD';
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
  subaccount?: string;
  bearer?: 'account' | 'subaccount';
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    fees: number;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
    };
  };
}

/**
 * Paystack API Client for AALAWSNG Law Firm Management System
 * Configured specifically for Nigerian Legal Practice Accounts (LPAR 1964 & RPC 2023)
 */
export const paystack = {
  /**
   * Initialize a Paystack transaction
   * IMPORTANT: When accepting client money / retainers, fee bearer is ALWAYS 'account'
   * so that transaction fees are absorbed by the firm and NEVER deducted from client funds.
   */
  async initialize(params: InitializePaymentParams): Promise<PaystackInitResponse> {
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.startsWith('sk_test_REPLACE')) {
      console.warn('[PAYSTACK] Test/Demo mode. Generating local payment simulation link.');
      const mockRef = params.reference || `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return {
        status: true,
        message: 'Authorization URL created (Demo Mode)',
        data: {
          authorization_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/verify-payment?reference=${mockRef}&amount=${params.amount}&currency=${params.currency || 'NGN'}`,
          access_code: `demo_access_${Date.now()}`,
          reference: mockRef,
        },
      };
    }

    const payload = {
      ...params,
      currency: params.currency || 'NGN',
      bearer: 'account', // Law firm absorbs gateway charges for client account payments per LPAR 1964
    };

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return (await res.json()) as PaystackInitResponse;
  },

  /**
   * Verify a Paystack transaction by reference
   */
  async verify(reference: string): Promise<PaystackVerifyResponse> {
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.startsWith('sk_test_REPLACE')) {
      console.warn('[PAYSTACK] Demo mode verification for ref:', reference);
      return {
        status: true,
        message: 'Verification successful (Demo Mode)',
        data: {
          id: Date.now(),
          domain: 'test',
          status: 'success',
          reference,
          amount: 5000000,
          gateway_response: 'Successful',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: 'card',
          currency: 'NGN',
          ip_address: '127.0.0.1',
          metadata: { destination: 'CLIENT_ACCOUNT' },
          fees: 75000,
          customer: {
            id: 1,
            first_name: 'Client',
            last_name: 'User',
            email: 'client@demo.com',
            customer_code: 'CUS_demo123',
            phone: '+2348000000000',
          },
        },
      };
    }

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    return (await res.json()) as PaystackVerifyResponse;
  },

  /**
   * Verify webhook signature from Paystack headers (`x-paystack-signature`)
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!PAYSTACK_SECRET_KEY) return true;
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  },
};
