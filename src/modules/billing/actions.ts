// Billing Actions

import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, Subscription } from '@/lib/mockDb';
import { prisma } from '@/lib/db';

/**
 * Interface representing a payment gateway transaction / subscription generator (Fase 2)
 */
export interface IBillingService {
  createCheckoutSession(userId: string, planId: string): Promise<{ success: boolean; initPoint?: string; error?: string }>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
  handleWebhook(payload: any): Promise<{ success: boolean }>;
}

/**
 * Abstract class representing Billing operations
 */
export class MercadoPagoBillingService implements IBillingService {
  async createCheckoutSession(userId: string, planId: string) {
    if (!FEATURE_FLAGS.ENABLE_PLANS_PHASE_2) {
      return { success: false, error: 'Módulo de pagos deshabilitado' };
    }

    console.log(`[Mercado Pago] Creando preferencia de pago para usuario ${userId} y plan ${planId}`);
    
    // Simulate Mercado Pago checkout init_point
    const mockInitPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock_pref_${Math.random().toString(36).substring(7)}`;
    
    // In demo mode, we just register a mock subscription directly as ACTIVE for quick demonstration
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const newSub: Subscription = {
        id: 'sub_' + Math.random().toString(36).substring(7),
        userId,
        planId,
        estado: 'ACTIVE',
        fechaInicio: new Date().toISOString(),
        paymentGateway: 'MERCADOPAGO',
        gatewaySubId: 'mp_sub_' + Math.random().toString(36).substring(7),
      };
      db.subscriptions.push(newSub);
      saveMockDb(db);
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          estado: 'ACTIVE',
          paymentGateway: 'MERCADOPAGO',
          gatewaySubId: 'mp_sub_' + Math.random().toString(36).substring(7),
        }
      });
    }

    return { success: true, initPoint: mockInitPoint };
  }

  async cancelSubscription(subscriptionId: string) {
    console.log(`[Mercado Pago] Cancelando suscripción ${subscriptionId}`);
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const sub = db.subscriptions.find(s => s.id === subscriptionId);
      if (sub) {
        sub.estado = 'CANCELLED';
        sub.fechaFin = new Date().toISOString();
        saveMockDb(db);
      }
    } else {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          estado: 'CANCELLED',
          fechaFin: new Date(),
        }
      });
    }
    return { success: true };
  }

  async handleWebhook(payload: any) {
    console.log('[Mercado Pago] Recibiendo IPN / Webhook', payload);
    return { success: true };
  }
}

/**
 * Server action to initiate checkout
 */
export async function initiateCheckout(planId: string, userId: string) {
  const billingService = new MercadoPagoBillingService();
  return await billingService.createCheckoutSession(userId, planId);
}

/**
 * Fetch user active subscriptions
 */
export async function getActiveSubscription(userId: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const sub = db.subscriptions.find(s => s.userId === userId && s.estado === 'ACTIVE');
      if (!sub) return { success: true, subscription: null };
      const plan = db.plans.find(p => p.id === sub.planId);
      return { success: true, subscription: { ...sub, plan } };
    } else {
      const sub = await prisma.subscription.findFirst({
        where: { userId, estado: 'ACTIVE' },
        include: { plan: true },
      });
      return { success: true, subscription: sub };
    }
  } catch (error) {
    console.error('Error fetching subscription', error);
    return { success: false, error: 'Error' };
  }
}
