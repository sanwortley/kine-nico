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
        <DinamoForm clients={clients} saveAction={saveDinamometria} />

        <DinamoHistorial rows={rows.map((r: any) => ({ ...r, fecha: r.fecha.toISOString() }))} />
      </div>
    </div>
  );
}