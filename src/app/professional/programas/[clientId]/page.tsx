import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getPrograma, getHistorialProgramas } from '@/modules/programas/actions';
import { getEjercicios } from '@/modules/ejercicios/actions';
import { saveDia } from '@/modules/programas/actions';
import ProgramaBuilder from './ProgramaBuilder';
import DeleteProgramaButton from './DeleteProgramaButton';
import LimpiarProgramaButton from './LimpiarProgramaButton';

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

  const [client, ejRes, programa, historial] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    getEjercicios(),
    getPrograma(clientId),
    getHistorialProgramas(clientId),
  ]);

  if (!client) redirect('/professional/evaluaciones');

  const ejercicios = ejRes.success ? (ejRes.ejercicios ?? []) : [];

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
    <div className="flex flex-col min-h-screen">
      <ProgramaBuilder
        clientId={client.id}
        clientName={client.name}
        bloqueActual={programa?.nombre ?? 'Bloque 1'}
        ejercicios={ejercicios.filter((e: any) => e.activo)}
        initialData={initialData}
        saveAction={saveDia}
        limpiarButton={programa ? <LimpiarProgramaButton clientId={client.id} /> : null}
      />

      {/* ── HISTORIAL DE BLOQUES ── */}
      {historial.length > 0 && (
        <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700">Historial de bloques</h2>
            <a
              href={`/professional/programas/${clientId}/progreso`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Ver informe de progreso IA
            </a>
          </div>

          <div className="space-y-2">
            {historial.map((b: any) => {
              const totalEj = b.dias.reduce((acc: number, d: any) => acc + d.ejercicios.length, 0);
              const dias = [...new Set(b.dias.map((d: any) => d.dia))].length;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-4 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{b.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {dias} días/sem · {totalEj} ejercicios ·{' '}
                      Cerrado {new Date(b.cerradoAt).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <a
                    href={`/professional/programas/${clientId}/print?programaId=${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Exportar PDF"
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                  <DeleteProgramaButton programaId={b.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}