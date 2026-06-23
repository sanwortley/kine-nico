'use server';

import { prisma } from '@/lib/db';

export async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { activo: true },
      orderBy: { price: 'asc' },
    });
    return { success: true, plans };
  } catch (error: any) {
    console.error('Error in getPlans', error);
    return { success: false, error: 'Error al obtener planes' };
  }
}

export async function createPlan(formData: FormData) {
  try {
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string;
    const price = parseFloat(formData.get('price') as string);
    const interval = formData.get('interval') as string || 'month';
    const features = (formData.get('features') as string || '').split(',').map(f => f.trim());
    const limiteTurnos = parseInt(formData.get('limiteTurnos') as string || '1', 10) || 1;
    if (!nombre || isNaN(price)) return { success: false, error: 'Datos de plan inválidos' };

    await prisma.plan.create({ data: { nombre, descripcion, price, interval, features, limiteTurnos, activo: true } });
    return { success: true };
  } catch (error: any) {
    console.error('Error creating plan', error);
    return { success: false, error: 'Error al crear plan' };
  }
}