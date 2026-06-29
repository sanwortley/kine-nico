import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import ClientList from '../programas/ClientList';

export const dynamic = 'force-dynamic';

export default async function PlanillasListPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role === 'CLIENT') redirect('/client/dashboard');

  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, status: true },
  });

  const withLabel = clients.map(c => ({
    id:    c.id,
    name:  c.status === 'ACTIVE' ? c.name : `${c.name} (${c.status === 'PENDING' ? 'Pendiente' : c.status})`,
    email: c.email,
  }));

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <a href="/admin/dashboard" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Volver al panel</a>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">Planillas del Atleta</h1>
          <p className="text-sm text-slate-500 mt-1">Seleccioná un paciente para ver o editar su planilla.</p>
        </div>
        {withLabel.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
            No hay pacientes todavía.
          </div>
        ) : (
          <ClientList clients={withLabel} basePath="/professional/planillas" showExport />
        )}
      </div>
    </div>
  );
}