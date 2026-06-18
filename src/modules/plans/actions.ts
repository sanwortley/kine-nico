'use server';

import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, Plan } from '@/lib/mockDb';
import { prisma } from '@/lib/db';

/**
 * Fetch all available subscription plans (Fase 2)
 */
export async function getPlans() {
  if (!FEATURE_FLAGS.ENABLE_PLANS_PHASE_2) {
    return { success: false, error: 'Módulo de planes inactivo por feature flag' };
  }

  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      return { success: true, plans: getMockDb().plans };
    } else {
      const plans = await prisma.plan.findMany({
        where: { activo: true },
        orderBy: { price: 'asc' },
      });
      return { success: true, plans };
    }
  } catch (error: any) {
    console.error('Error in getPlans', error);
    return { success: false, error: 'Error al obtener planes' };
  }
}

/**
 * Create plan skeleton (Fase 2)
 */
export async function createPlan(formData: FormData) {
  if (!FEATURE_FLAGS.ENABLE_PLANS_PHASE_2) {
    return { success: false, error: 'Módulo de planes inactivo' };
  }

  try {
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string;
    const price = parseFloat(formData.get('price') as string);
    const interval = formData.get('interval') as string || 'month';
    const features = (formData.get('features') as string || '').split(',').map(f => f.trim());

    if (!nombre || isNaN(price)) {
      return { success: false, error: 'Datos de plan inválidos' };
    }

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const newPlan: Plan = {
        id: 'plan_' + Math.random().toString(36).substring(7),
        nombre,
        descripcion,
        price,
        interval,
        features,
        activo: true,
        createdAt: new Date().toISOString(),
      };
      db.plans.push(newPlan);
      saveMockDb(db);
    } else {
      await prisma.plan.create({
        data: {
          nombre,
          descripcion,
          price,
          interval,
          features,
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating plan', error);
    return { success: false, error: 'Error' };
  }
}
