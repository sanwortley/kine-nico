'use server';

import { prisma } from '@/lib/db';

export interface SeriePayload {
  numero?: number;
  reps: string;
  pctRM: string;
  kg: string;
}

export interface EjercicioPayload {
  ejercicioId: string;
  nombre: string;
  patron: string;
  categoria: string;
  rir: string;
  descanso: string;
  tempo: string;
  microPausa: string;
  rounds: string;
  timeCap: string;
  series: SeriePayload[];
}

const DIA_INCLUDE = {
  dias: {
    include: {
      ejercicios: {
        orderBy: { orden: 'asc' as const },
        include: {
          ejercicio: { select: { nombre: true, patron: true } },
          series:    { orderBy: { numero: 'asc' as const } },
        },
      },
    },
  },
};

// Active program (cerradoAt = null)
export async function getPrograma(clientId: string) {
  return prisma.programa.findFirst({
    where: { clientId, cerradoAt: null },
    include: DIA_INCLUDE,
  });
}

// All closed programs ordered newest first
export async function getHistorialProgramas(clientId: string) {
  return prisma.programa.findMany({
    where: { clientId, cerradoAt: { not: null } },
    orderBy: { cerradoAt: 'desc' },
    include: DIA_INCLUDE,
  });
}

export async function deletePrograma(programaId: string) {
  await prisma.programa.delete({ where: { id: programaId } });
  return { success: true };
}

// Close current block and open a new one
export async function cerrarYNuevoBloque(clientId: string, nombreNuevo: string) {
  const activo = await prisma.programa.findFirst({ where: { clientId, cerradoAt: null } });
  if (activo) {
    await prisma.programa.update({ where: { id: activo.id }, data: { cerradoAt: new Date() } });
  }
  const siguiente = activo
    ? `Bloque ${parseInt(activo.nombre.replace(/\D/g, '') || '1') + 1}`
    : 'Bloque 1';
  await prisma.programa.create({ data: { clientId, nombre: nombreNuevo || siguiente } });
  return { success: true };
}

export async function saveDia(
  clientId: string,
  semana: number,
  dia: number,
  ejercicios: EjercicioPayload[],
) {
  let programa = await prisma.programa.findFirst({ where: { clientId, cerradoAt: null } });
  if (!programa) {
    programa = await prisma.programa.create({ data: { clientId } });
  }

  let diaRec = await prisma.programaDia.findUnique({
    where: { programaId_semana_dia: { programaId: programa.id, semana, dia } },
  });
  if (!diaRec) {
    diaRec = await prisma.programaDia.create({
      data: { programaId: programa.id, semana, dia },
    });
  }

  await prisma.programaEjercicio.deleteMany({ where: { diaId: diaRec.id } });

  for (let i = 0; i < ejercicios.length; i++) {
    const ej = ejercicios[i];
    await prisma.programaEjercicio.create({
      data: {
        diaId:       diaRec.id,
        ejercicioId: ej.ejercicioId,
        orden:       i,
        categoria:   ej.categoria  || null,
        rir:         ej.rir        || null,
        descanso:    ej.descanso   || null,
        tempo:       ej.tempo      || null,
        microPausa:  ej.microPausa || null,
        rounds:      ej.rounds     || null,
        timeCap:     ej.timeCap    || null,
        series: {
          create: ej.series.map((s, idx) => ({
            numero: s.numero ?? idx + 1,
            reps:   s.reps  ? parseInt(s.reps)    : null,
            pctRM:  s.pctRM ? parseFloat(s.pctRM) : null,
            kg:     s.kg    ? parseFloat(s.kg)    : null,
          })),
        },
      },
    });
  }

  return { success: true };
}