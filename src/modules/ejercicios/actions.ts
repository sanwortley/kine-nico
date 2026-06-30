'use server';

import { prisma } from '@/lib/db';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

const fetchEjercicios = unstable_cache(
  async () =>
    prisma.ejercicio.findMany({
      orderBy: [{ patron: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true, patron: true, videoUrl: true, activo: true },
    }),
  ['ejercicios'],
  { tags: ['ejercicios'] },
);

export async function getEjercicios() {
  try {
    const ejercicios = await fetchEjercicios();
    return { success: true, ejercicios };
  } catch (error: any) {
    console.error('Error in getEjercicios', error);
    return { success: false, ejercicios: [], error: 'Error al obtener ejercicios' };
  }
}

function invalidateEjercicios() {
  revalidateTag('ejercicios', 'max');
  revalidatePath('/admin/dashboard');
}

export async function createEjercicio(formData: FormData) {
  try {
    const nombre      = (formData.get('nombre') as string)?.trim();
    const patron      = (formData.get('patron') as string)?.trim();
    const descripcion = (formData.get('descripcion') as string)?.trim() || null;
    if (!nombre || !patron) return { success: false, error: 'Nombre y patrón son obligatorios' };
    await prisma.ejercicio.create({ data: { nombre, patron, descripcion, activo: true } });
    invalidateEjercicios();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al crear ejercicio' };
  }
}

export async function updateEjercicio(formData: FormData) {
  try {
    const id          = formData.get('id') as string;
    const nombre      = (formData.get('nombre') as string)?.trim();
    const patron      = (formData.get('patron') as string)?.trim();
    const descripcion = (formData.get('descripcion') as string)?.trim() || null;
    if (!id || !nombre || !patron) return { success: false, error: 'Datos inválidos' };
    await prisma.ejercicio.update({ where: { id }, data: { nombre, patron, descripcion } });
    invalidateEjercicios();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al actualizar ejercicio' };
  }
}

export async function toggleEjercicioActivo(id: string, activo: boolean) {
  try {
    await prisma.ejercicio.update({ where: { id }, data: { activo: !activo } });
    invalidateEjercicios();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error' };
  }
}

export async function deleteEjercicio(id: string) {
  try {
    await prisma.ejercicio.delete({ where: { id } });
    invalidateEjercicios();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al eliminar ejercicio' };
  }
}