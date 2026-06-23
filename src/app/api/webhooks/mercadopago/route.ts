import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminConfirmPayment } from '@/modules/billing/actions';

function verifySignature(rawBody: string, signature: string, requestId: string, webhookSecret: string): boolean {
  try {
    const parts = Object.fromEntries(signature.split(',').map(p => p.split('=')));
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const dataId = JSON.parse(rawBody)?.data?.id ?? '';
    const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(template).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

async function activateByPayment(paymentId: string, externalReference?: string): Promise<void> {
  if (externalReference) {
    await adminConfirmPayment(externalReference);
    return;
  }

  const mpAccessToken = process.env.MP_ACCESS_TOKEN;
  if (!mpAccessToken) {
    console.error('[MP Webhook] MP_ACCESS_TOKEN not set — cannot look up payment');
    return;
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });

  if (!res.ok) {
    console.error('[MP Webhook] Failed to fetch payment', paymentId, await res.text());
    return;
  }

  const payment = await res.json();
  if (payment.status !== 'approved') {
    console.log(`[MP Webhook] Payment ${paymentId} not approved (status: ${payment.status}) — skipping`);
    return;
  }

  const subscriptionId = payment.external_reference as string | undefined;
  if (!subscriptionId) {
    console.error('[MP Webhook] Payment has no external_reference — cannot activate subscription');
    return;
  }

  await adminConfirmPayment(subscriptionId);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers.get('x-signature') ?? '';
    const requestId = req.headers.get('x-request-id') ?? '';
    if (!verifySignature(rawBody, signature, requestId, webhookSecret)) {
      console.warn('[MP Webhook] Invalid signature — rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[MP Webhook] Received:', JSON.stringify(payload));

  if (payload.type === 'payment' && payload.data?.id) {
    try {
      await activateByPayment(String(payload.data.id), payload.data?.external_reference as string | undefined);
    } catch (err) {
      console.error('[MP Webhook] Error activating subscription:', err);
    }
  }

  if (payload.topic === 'payment' && payload.resource) {
    try {
      const paymentId = String(payload.resource).split('/').pop();
      if (paymentId) await activateByPayment(paymentId);
    } catch (err) {
      console.error('[MP Webhook] Error processing IPN:', err);
    }
  }

  return NextResponse.json({ received: true });
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const subscriptionId = req.nextUrl.searchParams.get('subscriptionId');
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
  }

  const result = await adminConfirmPayment(subscriptionId);
  return NextResponse.json(result);
}