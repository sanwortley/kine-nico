import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { logoutUser } from '@/modules/auth/actions';
import ProfCalendar from './ProfCalendar';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProfessionalDashboard() {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role !== 'PROFESSIONAL') redirect('/client/dashboard');

  const professional = await prisma.professional.findFirst({
    where: { email: session.email },
    include: { service: true },
  });

  if (!professional) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-slate-600 font-semibold">No se encontró tu perfil de profesional.</p>
          <p className="text-sm text-slate-400 mt-1">Contactá al administrador para que configure tu cuenta.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const turnos = await prisma.turno.findMany({
    where: {
      professionalId: professional.id,
      estado: { in: ['DISPONIBLE', 'RESERVADO', 'COMPLETADO'] },
    },
    include: {
      service: true,
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { fechaInicio: 'asc' },
  });

  const todayTurnos = turnos.filter(t => {
    const d = new Date(t.fechaInicio);
    return d.toDateString() === now.toDateString();
  });
  const pendingToday = todayTurnos.filter(t => t.estado === 'RESERVADO').length;
  const availableToday = todayTurnos.filter(t => t.estado === 'DISPONIBLE').length;
  const totalReserved = turnos.filter(t => t.estado === 'RESERVADO').length;

  async function handleLogout() {
    'use server';
    await logoutUser();
    redirect('/auth/login');
  }

  // Serialize for client component
  const serializedTurnos = turnos.map(t => ({
    id: t.id,
    fechaInicio: t.fechaInicio.toISOString(),
    duracion: t.duracion,
    estado: t.estado,
    notas: t.notas,
    service: { name: t.service.name },
    client: t.client ? { name: t.client.name, email: t.client.email } : null,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-150 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="NJK" width={32} height={32} className="object-contain" />
            <div>
              <span className="font-bold text-primary text-sm">{session.name}</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                Profesional
              </span>
            </div>
          </div>
          <form action={handleLogout}>
            <button className="text-xs text-slate-500 hover:text-red-500 transition-colors font-medium cursor-pointer px-3 py-1.5 rounded-lg hover:bg-red-50">
              Cerrar Sesión
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Turnos hoy" value={todayTurnos.length} color="primary" />
          <StatCard label="Reservados hoy" value={pendingToday} color="blue" />
          <StatCard label="Disponibles hoy" value={availableToday} color="green" />
          <StatCard label="Total reservados" value={totalReserved} color="accent" />
        </div>

        {/* Accesos rápidos */}
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/professional/evaluaciones"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dinamometría
          </Link>
          <Link
            href="/professional/ficha"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Fichas
          </Link>
        </div>

        {/* Professional info */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">
              {professional.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-800">{professional.name}</p>
            <p className="text-sm text-slate-500">{professional.specialty}</p>
            {professional.email && (
              <p className="text-xs text-slate-400">{professional.email}</p>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 sm:p-6">
          <h2 className="font-title text-lg font-bold text-primary mb-4">Mi Agenda</h2>
          <ProfCalendar turnos={serializedTurnos} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary',
    blue: 'text-blue-500',
    green: 'text-green-500',
    accent: 'text-accent',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}