import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getPrograma } from '@/modules/programas/actions';
import { getEjercicios } from '@/modules/ejercicios/actions';
import { saveDia } from '@/modules/programas/actions';
import ProgramaBuilder from './ProgramaBuilder';

export const dynamic = 'force-dynamic';

export default async function ProgramaPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role === 'CLIENT') redirect('/client/dashboard');

  const { clientId } = await params;

  const [client, ejRes, programa] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    getEjercicios(),
    getPrograma(clientId),
  ]);

  if (!client) redirect('/professional/evaluaciones');

  const ejercicios = ejRes.success ? (ejRes.ejercicios ?? []) : [];

  // Transform DB programa → DayMap { "s-d": EjercicioPayload[] }
  type DayMap = Record<string, any[]>;
  const initialData: DayMap = {};

  if (programa) {
    for (const dia of programa.dias) {
      const key = `${dia.semana}-${dia.dia}`;
      initialData[key] = dia.ejercicios.map((pe: any) => ({
        ejercicioId: pe.ejercicioId,
        nombre:      pe.ejercicio.nombre,
        patron:      pe.ejercicio.patron,
        categoria:   pe.categoria   ?? '',
        rir:         pe.rir         ?? '',
        descanso:    pe.descanso    ?? '',
        tempo:       pe.tempo       ?? '',
        microPausa:  pe.microPausa  ?? '',
        rounds:      pe.rounds      ?? '',
        timeCap:     pe.timeCap     ?? '',
        series:      pe.series.map((s: any) => ({
          numero: s.numero,
          reps:   s.reps  != null ? String(s.reps)  : '',
          pctRM:  s.pctRM != null ? String(s.pctRM) : '',
          kg:     s.kg    != null ? String(s.kg)    : '',
        })),
      }));
    }
  }

  return (
    <ProgramaBuilder
      clientId={client.id}
      clientName={client.name}
      ejercicios={ejercicios.filter((e: any) => e.activo)}
      initialData={initialData}
      saveAction={saveDia}
    />
  );
}