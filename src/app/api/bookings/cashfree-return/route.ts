import { NextResponse } from 'next/server';
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from '@/lib/payments/domain';
import { getPaymentProviderAdapter } from '@/lib/payments/adapters/registry';
import { findOrderByProviderOrderId, findProviderAccountById } from '@/lib/payments/repository';
import { confirmPaymentFromWebhook } from '@/lib/payments/service';

function dashboardRedirect(request: Request, status: string) {
  const url = new URL('/dashboard/user', request.url);
  url.searchParams.set('tab', 'premium');
  url.searchParams.set('payment', status);
  return NextResponse.redirect(url, 303);
}

async function readReturnParams(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    const body = await request.text();
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = new URLSearchParams(body);
      for (const [key, value] of form) params.set(key, value);
    } else if (contentType.includes('application/json') && body) {
      try {
        const json = JSON.parse(body) as Record<string, unknown>;
        for (const [key, value] of Object.entries(json)) {
          if (typeof value === 'string') params.set(key, value);
        }
      } catch {
        // Ignore malformed return bodies; query params are enough for our flow.
      }
    }
  }

  return {
    orderId: params.get('order_id') || params.get('orderId') || params.get('cf_order_id') || '',
  };
}

async function handleCashfreeReturn(request: Request) {
  try {
    const { orderId } = await readReturnParams(request);
    if (!orderId) return dashboardRedirect(request, 'missing_order');

    const order = await findOrderByProviderOrderId(PAYMENT_PROVIDER.CASHFREE, orderId);
    if (!order) return dashboardRedirect(request, 'order_not_found');

    if (order.status === PAYMENT_STATUS.SUCCESS) {
      return dashboardRedirect(request, 'success');
    }

    const providerAccount = await findProviderAccountById(order.provider_account_id);
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.CASHFREE);
    const status = await adapter.fetchOrderStatus?.(order.provider_order_id || orderId, providerAccount);

    if (status?.status === PAYMENT_STATUS.SUCCESS) {
      const result = await confirmPaymentFromWebhook({
        provider: PAYMENT_PROVIDER.CASHFREE,
        providerOrderId: order.provider_order_id || orderId,
        providerPaymentId: order.provider_order_id || orderId,
        amount: Number(order.amount),
        currency: order.currency,
        method: 'cashfree_return',
        rawPayment: status.raw,
      });

      if (result.ok) return dashboardRedirect(request, 'success');
      console.error('[CASHFREE RETURN] Confirmation failed:', result.error);
      return dashboardRedirect(request, 'confirmation_pending');
    }

    if (status?.status === PAYMENT_STATUS.FAILED) return dashboardRedirect(request, 'failed');
    return dashboardRedirect(request, 'pending');
  } catch (error) {
    console.error('[CASHFREE RETURN] Error:', error);
    return dashboardRedirect(request, 'error');
  }
}

export async function GET(request: Request) {
  return handleCashfreeReturn(request);
}

export async function POST(request: Request) {
  return handleCashfreeReturn(request);
}

