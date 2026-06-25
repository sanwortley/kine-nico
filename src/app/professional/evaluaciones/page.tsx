import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getClients, getDinamometrias, saveDinamometria } from '@/modules/dinamometria/actions';
import DinamoForm from './DinamoForm';
import DinamoHistorial from './DinamoHistorial';
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
      <header className="bg-white border-b border-slate-100 px-4 py-0 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/professional/dashboard"
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Volver"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-slate-800 text-base truncate">Dinamometría</h1>
        </div>
        <span className="text-xs text-slate-400 shrink-0 truncate max-w-[140px] text-right">{session.name}</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <DinamoForm clients={clients} saveAction={saveDinamometria} />

        <DinamoHistorial rows={rows.map((r: any) => ({ ...r, fecha: r.fecha.toISOString() }))} />
      </div>
    </div>
  );
}