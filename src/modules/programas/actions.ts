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

export async function getPrograma(clientId: string) {
  const programa = await prisma.programa.findFirst({
    where: { clientId },
    include: {
      dias: {
        include: {
          ejercicios: {
            orderBy: { orden: 'asc' },
            include: {
              ejercicio: { select: { nombre: true, patron: true } },
              series:    { orderBy: { numero: 'asc' } },
            },
          },
        },
      },
    },
  });
  return programa;
}

export async function saveDia(
  clientId: string,
  semana: number,
  dia: number,
  ejercicios: EjercicioPayload[],
) {
  // Get or create programa
  let programa = await prisma.programa.findFirst({ where: { clientId } });
  if (!programa) {
    programa = await prisma.programa.create({ data: { clientId } });
  }

  // Get or create day
  let diaRec = await prisma.programaDia.findUnique({
    where: { programaId_semana_dia: { programaId: programa.id, semana, dia } },
  });
  if (!diaRec) {
    diaRec = await prisma.programaDia.create({
      data: { programaId: programa.id, semana, dia },
    });
  }

  // Replace exercises (cascade deletes series)
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
            reps:   s.reps  ? parseInt(s.reps)   : null,
            pctRM:  s.pctRM ? parseFloat(s.pctRM) : null,
            kg:     s.kg    ? parseFloat(s.kg)    : null,
          })),
        },
      },
    });
  }

  return { success: true };
}