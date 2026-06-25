import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getClients, getDinamometrias, saveDinamometria } from '@/modules/dinamometria/actions';
import DinamoForm from './DinamoForm';
import Link from 'next/link';

export default async function EvaluacionesPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role !== 'PROFESSIONAL' && session.role !== 'ADMIN') redirect('/client/dashboard');

  const [{ clients }, { rows }] = await Promise.all([
    getClients(),
    getDinamometrias(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/professional/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors text-sm">
            ← Dashboard
          </Link>
          <span className="text-slate-200">|</span>
          <h1 className="font-bold text-slate-800">Dinamometría</h1>
        </div>
        <span className="text-sm text-slate-500">{session.name}</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Form */}
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-4">Nueva evaluación</h2>
          <DinamoForm clients={clients} saveAction={saveDinamometria} />
        </section>

        {/* Historial */}
        {rows.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-700 mb-4">Historial reciente</h2>
            <div className="space-y-2">
              {rows.map((r: any) => {
                const diff = (a?: number | null, b?: number | null) => {
                  if (!a || !b) return null;
                  return Math.round(((Math.max(a, b) - Math.min(a, b)) / Math.max(a, b)) * 100 * 10) / 10;
                };
                const fecha = new Date(r.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{r.client.name}</p>
                        <p className="text-xs text-slate-400">{fecha}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {r.cuadDer && r.cuadIzq && (
                          <span>Cuád: <strong className="text-slate-700">{diff(r.cuadDer, r.cuadIzq)}%</strong></span>
                        )}
                        {r.isquioDer && r.isquioIzq && (
                          <span>Isquio: <strong className="text-slate-700">{diff(r.isquioDer, r.isquioIzq)}%</strong></span>
                        )}
                        {r.abdDer && r.abdIzq && (
                          <span>Abd: <strong className="text-slate-700">{diff(r.abdDer, r.abdIzq)}%</strong></span>
                        )}
                        {r.peso && r.altura && (
                          <span>IMC: <strong className="text-slate-700">{Math.round(r.peso / (r.altura * r.altura) * 10) / 10}</strong></span>
                        )}
                        {r.velocidadSquat && (
                          <span>VSquat: <strong className="text-slate-700">{r.velocidadSquat} m/s</strong></span>
                        )}
                      </div>
                    </div>
                    {r.notas && <p className="text-xs text-slate-400 mt-2 italic">{r.notas}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}