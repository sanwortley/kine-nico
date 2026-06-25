'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type DinamoInput = {
  clientId: string;
  fecha: string;
  notas?: string;
  peso?: number;
  altura?: number;
  cuadDer?: number; cuadIzq?: number;
  isquioDer?: number; isquioIzq?: number;
  abdDer?: number; abdIzq?: number;
  addDer?: number; addIzq?: number;
  eversorDer?: number; eversorIzq?: number;
  romCaderaDer?: number; romCaderaIzq?: number;
  romTobilloDer?: number; romTobilloIzq?: number;
  velocidadSquat?: number;
};

function num(v: number | undefined) {
  return v != null && !isNaN(v) ? v : null;
}

export async function saveDinamometria(data: DinamoInput) {
  try {
    await prisma.dinamometria.create({
      data: {
        clientId:       data.clientId,
        fecha:          new Date(data.fecha),
        notas:          data.notas || null,
        peso:           num(data.peso),
        altura:         num(data.altura),
        cuadDer:        num(data.cuadDer),
        cuadIzq:        num(data.cuadIzq),
        isquioDer:      num(data.isquioDer),
        isquioIzq:      num(data.isquioIzq),
        abdDer:         num(data.abdDer),
        abdIzq:         num(data.abdIzq),
        addDer:         num(data.addDer),
        addIzq:         num(data.addIzq),
        eversorDer:     num(data.eversorDer),
        eversorIzq:     num(data.eversorIzq),
        romCaderaDer:   num(data.romCaderaDer),
        romCaderaIzq:   num(data.romCaderaIzq),
        romTobilloDer:  num(data.romTobilloDer),
        romTobilloIzq:  num(data.romTobilloIzq),
        velocidadSquat: num(data.velocidadSquat),
      },
    });
    revalidatePath('/professional/evaluaciones');
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveDinamometria', error);
    return { success: false, error: error.message || 'Error al guardar' };
  }
}

export async function getDinamometrias(clientId?: string) {
  try {
    const rows = await prisma.dinamometria.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { name: true } } },
      orderBy: { fecha: 'desc' },
      take: 50,
    });
    return { success: true, rows };
  } catch (error) {
    console.error('Error in getDinamometrias', error);
    return { success: true, rows: [] };
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
    console.error('Error in getClients', error);
    return { success: true, clients: [] };
  }
}