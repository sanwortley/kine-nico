'use server';

import { prisma } from '@/lib/db';

// ── Checkout / Mercado Pago ────────────────────────────────────────────────────

export async function initiateCheckout(planId: string, userId: string) {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return { success: false, error: 'Plan no encontrado' };

    // Cancel any existing active or pending subscription
    await prisma.subscription.updateMany({
      where: { userId, estado: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
      data: { estado: 'CANCELLED', fechaFin: new Date() },
    });

    // Create subscription in PENDING_PAYMENT state
    const sub = await prisma.subscription.create({
      data: { userId, planId, estado: 'PENDING_PAYMENT', turnosRestantes: plan.limiteTurnos, paymentGateway: 'MERCADOPAGO' },
    });

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    // No MP credentials → return app redirect (dev / manual-payment mode)
    if (!mpAccessToken) {
      const appReturn = `/client/dashboard?tab=planes&successMsg=${encodeURIComponent('Tu solicitud fue registrada. El plan se activará cuando se confirme el pago.')}`;
      return { success: true, initPoint: appReturn, isPending: true };
    }

    // Real Mercado Pago checkout
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpAccessToken}` },
      body: JSON.stringify({
        items: [{ title: plan.nombre, description: plan.descripcion, quantity: 1, currency_id: 'ARS', unit_price: plan.price }],
        external_reference: sub.id,
        back_urls: {
          success: `${appBaseUrl}/payment/success?plan=${encodeURIComponent(plan.nombre)}`,
          failure: `${appBaseUrl}/client/dashboard?tab=planes&errorMsg=${encodeURIComponent('El pago no pudo procesarse. Intentá de nuevo.')}`,
          pending: `${appBaseUrl}/client/dashboard?tab=planes&successMsg=${encodeURIComponent('Tu pago está siendo procesado. Te avisaremos cuando esté confirmado.')}`,
        },
        auto_return: 'approved',
        notification_url: `${appBaseUrl}/api/webhooks/mercadopago`,
      }),
    });

    if (!prefResponse.ok) {
      console.error('[MP] Error creando preferencia:', await prefResponse.text());
      return { success: false, error: 'Error al crear la preferencia de pago en Mercado Pago.' };
    }

    const pref = await prefResponse.json();
    await prisma.subscription.update({ where: { id: sub.id }, data: { gatewaySubId: pref.id } });

    const initPoint = process.env.MP_SANDBOX === 'true' ? pref.sandbox_init_point : pref.init_point;
    return { success: true, initPoint };
  } catch (error: any) {
    console.error('Error in initiateCheckout', error);
    return { success: false, error: error.message || 'Error al iniciar el checkout' };
  }
}

export async function initiateCheckoutCash(planId: string, userId: string) {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return { success: false, error: 'Plan no encontrado' };

    await prisma.subscription.updateMany({
      where: { userId, estado: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
      data: { estado: 'CANCELLED', fechaFin: new Date() },
    });

    await prisma.subscription.create({
      data: { userId, planId, estado: 'PENDING_PAYMENT', turnosRestantes: plan.limiteTurnos, paymentGateway: 'CASH' },
    });

    return {
      success: true,
      initPoint: `/client/dashboard?tab=planes&successMsg=${encodeURIComponent('Tu solicitud fue registrada. El pago se confirmará en efectivo en tu primera sesión con el profesional.')}`,
    };
  } catch (error: any) {
    console.error('Error in initiateCheckoutCash', error);
    return { success: false, error: error.message || 'Error al registrar el pedido' };
  }
}

// ── Admin actions ──────────────────────────────────────────────────────────────

export async function getAdminSubscriptions() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { plan: true },
      orderBy: { fechaInicio: 'desc' },
    });
    return { success: true, subscriptions };
  } catch (error) {
    console.error('Error in getAdminSubscriptions', error);
    return { success: true, subscriptions: [] };
  }
}

export async function adminAssignPlan(userId: string, planId: string, customCredits?: number) {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return { success: false, error: 'Plan no encontrado' };

    await prisma.subscription.updateMany({
      where: { userId, estado: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
      data: { estado: 'CANCELLED', fechaFin: new Date() },
    });

    const credits = customCredits ?? plan.limiteTurnos;
    const now = new Date();
    const daysMap: Record<string, number> = { week: 7, month: 30 };
    const days = daysMap[plan.interval] ?? 45;

    await prisma.subscription.create({
      data: {
        userId, planId, estado: 'ACTIVE', turnosRestantes: credits,
        fechaInicio: now, fechaFin: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
        paymentGateway: 'MANUAL',
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in adminAssignPlan', error);
    return { success: false, error: error.message || 'Error al asignar plan' };
  }
}

export async function adminAdjustCredits(subscriptionId: string, credits: number) {
  try {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { turnosRestantes: Math.max(0, credits) },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in adminAdjustCredits', error);
    return { success: false, error: error.message || 'Error al ajustar créditos' };
  }
}

export async function adminConfirmPayment(subscriptionId: string) {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: subscriptionId, estado: 'PENDING_PAYMENT' },
      include: { plan: true },
    });
    if (!sub) return { success: false, error: 'Suscripción pendiente no encontrada' };

    const now = new Date();
    const daysMap: Record<string, number> = { week: 7, month: 30 };
    const days = daysMap[sub.plan.interval] ?? 45;

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        estado: 'ACTIVE',
        turnosRestantes: sub.plan.limiteTurnos,
        fechaInicio: now,
        fechaFin: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in adminConfirmPayment', error);
    return { success: false, error: error.message || 'Error al confirmar pago' };
  }
}

// ── Client queries ─────────────────────────────────────────────────────────────

export async function getActiveSubscription(userId: string) {
  try {
    const now = new Date();
    const sub = await prisma.subscription.findFirst({
      where: { userId, estado: 'ACTIVE', OR: [{ fechaFin: null }, { fechaFin: { gt: now } }] },
      include: { plan: true },
    });
    return { success: true, subscription: sub };
  } catch (error) {
    console.error('Error fetching subscription', error);
    return { success: false, error: 'Error' };
  }
}

export async function getPendingSubscription(userId: string) {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId, estado: 'PENDING_PAYMENT' },
      include: { plan: true },
      orderBy: { fechaInicio: 'desc' },
    });
    return { success: true, subscription: sub };
  } catch (error) {
    console.error('Error fetching pending subscription', error);
    return { success: false, error: 'Error' };
  }
}