import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPendingSubscriptionFromPayment } from '@/modules/billing/actions';

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

async function handlePayment(paymentId: string): Promise<void> {
  const mpAccessToken = process.env.MP_ACCESS_TOKEN;
  if (!mpAccessToken) {
    console.error('[MP Webhook] MP_ACCESS_TOKEN not set');
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
    console.log(`[MP Webhook] Payment ${paymentId} status: ${payment.status} — skipping`);
    return;
  }

  const externalReference = payment.external_reference as string | undefined;
  if (!externalReference || !externalReference.includes(':')) {
    console.error('[MP Webhook] Invalid external_reference:', externalReference);
    return;
  }

  const [planId, userId] = externalReference.split(':');
  await createPendingSubscriptionFromPayment(planId, userId, String(paymentId));
  console.log(`[MP Webhook] PENDING_PAYMENT subscription created — plan:${planId} user:${userId}`);
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
      await handlePayment(String(payload.data.id));
    } catch (err) {
      console.error('[MP Webhook] Error handling payment:', err);
    }
  }

  if (payload.topic === 'payment' && payload.resource) {
    try {
      const paymentId = String(payload.resource).split('/').pop();
      if (paymentId) await handlePayment(paymentId);
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

  const planId = req.nextUrl.searchParams.get('planId');
  const userId = req.nextUrl.searchParams.get('userId');
  if (!planId || !userId) {
    return NextResponse.json({ error: 'Missing planId or userId' }, { status: 400 });
  }

  await createPendingSubscriptionFromPayment(planId, userId, 'dev-test');
  return NextResponse.json({ success: true });
}