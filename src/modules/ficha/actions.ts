'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type RomTest = { prueba: string; der: string; izq: string; total: string; obs: string };
export type FuerzaTest = { ejercicio: string; peso: string; reps: string };
export type CapacidadTests = Record<string, string>;
export type DinamoExt = Record<string, string>;

export type FichaInput = {
  clientId: string;
  fecha: string;
  // Básicos
  peso?: number; altura?: number; sexo?: string; grasaEst?: number; deporte?: string; catPeso?: string;
  // Complejos
  historia?: Record<string, string>;
  romTests?: RomTest[];
  fuerzaTests?: FuerzaTest[];
  capacidadTests?: CapacidadTests;
  dinamoExt?: DinamoExt;
  // Observaciones
  fortalezas?: string; debilidades?: string; prioridades?: string;
  restricciones?: string; objetivos12sem?: string; fechaReevaluacion?: string; notas?: string;
};

function n(v: number | undefined) {
  return v != null && !isNaN(v) ? v : null;
}

export async function saveFicha(data: FichaInput) {
  try {
    await prisma.fichaEvaluacion.create({
      data: {
        clientId:          data.clientId,
        fecha:             new Date(data.fecha),
        peso:              n(data.peso),
        altura:            n(data.altura),
        sexo:              data.sexo || null,
        grasaEst:          n(data.grasaEst),
        deporte:           data.deporte || null,
        catPeso:           data.catPeso || null,
        historia:          data.historia ?? undefined,
        romTests:          data.romTests ?? undefined,
        fuerzaTests:       data.fuerzaTests ?? undefined,
        capacidadTests:    data.capacidadTests ?? undefined,
        dinamoExt:         data.dinamoExt ?? undefined,
        fortalezas:        data.fortalezas || null,
        debilidades:       data.debilidades || null,
        prioridades:       data.prioridades || null,
        restricciones:     data.restricciones || null,
        objetivos12sem:    data.objetivos12sem || null,
        fechaReevaluacion: data.fechaReevaluacion ? new Date(data.fechaReevaluacion) : null,
        notas:             data.notas || null,
      },
    });
    revalidatePath('/professional/ficha');
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveFicha', error);
    return { success: false, error: error.message || 'Error al guardar' };
  }
}

export async function updateFicha(id: string, data: FichaInput) {
  try {
    await prisma.fichaEvaluacion.update({
      where: { id },
      data: {
        fecha:             new Date(data.fecha),
        peso:              n(data.peso),
        altura:            n(data.altura),
        sexo:              data.sexo || null,
        grasaEst:          n(data.grasaEst),
        deporte:           data.deporte || null,
        catPeso:           data.catPeso || null,
        historia:          data.historia ?? undefined,
        romTests:          data.romTests ?? undefined,
        fuerzaTests:       data.fuerzaTests ?? undefined,
        capacidadTests:    data.capacidadTests ?? undefined,
        dinamoExt:         data.dinamoExt ?? undefined,
        fortalezas:        data.fortalezas || null,
        debilidades:       data.debilidades || null,
        prioridades:       data.prioridades || null,
        restricciones:     data.restricciones || null,
        objetivos12sem:    data.objetivos12sem || null,
        fechaReevaluacion: data.fechaReevaluacion ? new Date(data.fechaReevaluacion) : null,
        notas:             data.notas || null,
      },
    });
    revalidatePath('/professional/ficha');
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateFicha', error);
    return { success: false, error: error.message || 'Error al actualizar' };
  }
}

export async function getFichas(clientId?: string) {
  try {
    const rows = await prisma.fichaEvaluacion.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { name: true } } },
      orderBy: { fecha: 'desc' },
      take: 50,
    });
    return { success: true, rows };
  } catch (error) {
    console.error('Error in getFichas', error);
    return { success: true, rows: [] };
  }
}

export async function getLastDinamometria(clientId: string) {
  try {
    const d = await prisma.dinamometria.findFirst({
      where: { clientId },
      orderBy: { fecha: 'desc' },
    });
    return { success: true, data: d };
  } catch {
    return { success: true, data: null };
  }
}

export async function getClients() {
  try {
    const clients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        status: 'ACTIVE',
        subscriptions: { some: { estado: 'ACTIVE' } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, clients };
  } catch (error) {
    return { success: true, clients: [] };
  }
}