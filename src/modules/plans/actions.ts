'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
    return { success: true, plans };
  } catch (error: any) {
    console.error('Error in getPlans', error);
    return { success: false, error: 'Error al obtener planes' };
  }
}

export async function updatePlan(formData: FormData) {
  try {
    const id          = formData.get('id') as string;
    const nombre      = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string;
    const price       = parseFloat(formData.get('price') as string);
    const interval    = formData.get('interval') as string || 'month';
    const features    = (formData.get('features') as string || '').split(',').map(f => f.trim()).filter(Boolean);
    const limiteTurnos = parseInt(formData.get('limiteTurnos') as string || '1', 10) || 1;
    if (!id || !nombre || isNaN(price)) return { success: false, error: 'Datos inválidos' };
    await prisma.plan.update({ where: { id }, data: { nombre, descripcion, price, interval, features, limiteTurnos } });
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al actualizar plan' };
  }
}

export async function togglePlanActive(id: string, activo: boolean) {
  try {
    await prisma.plan.update({ where: { id }, data: { activo: !activo } });
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error' };
  }
}

export async function deletePlan(id: string) {
  try {
    await prisma.plan.delete({ where: { id } });
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al eliminar plan' };
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