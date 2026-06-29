'use server';

import { prisma } from '@/lib/db';

export type PlanillaData = {
  fechaNacimiento?: string;
  pesoCorporal?: number | null;
  largoTibia?: number | null;
  lugarResidencia?: string;
  diferenciaHoraria?: string;
  telefono?: string;
  fechaCxLesion?: string;
  evolucionMeses?: number | null;
  fechaInicioRh?: string;
  evolucionRhRf?: string;
  lesionesCx?: string;
  fechasLesiones?: string;
  antecedentes?: string;
  comportDolor?: string;
  estudiosComp?: string;
  trabajoProfesion?: string;
  motivoConsulta?: string;
  expectativas?: string;
  objCorto?: string;
  objMediano?: string;
  objLargo?: string;
  tiempoEntrenando?: string;
  vecesXSemana?: string;
  tipoEntrenamiento?: string;
  lesionesPrevias?: string;
  disponibilidad?: Record<string, { actividad: string; intensidad: string; obs: string }>;
  dondeEntrenar?: string;
  elementosDisp?: string;
  tiempoDisponible?: string;
  observaciones?: string;
};

export async function getPlanilla(clientId: string) {
  return prisma.planillaAtleta.findUnique({ where: { clientId } });
}

export async function savePlanilla(clientId: string, data: PlanillaData) {
  return prisma.planillaAtleta.upsert({
    where:  { clientId },
    create: { clientId, ...data },
    update: { ...data, updatedAt: new Date() },
  });
}