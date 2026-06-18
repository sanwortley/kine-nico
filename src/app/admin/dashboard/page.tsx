import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAllUsers } from '@/modules/auth/actions';
import { getServices } from '@/modules/services-offered/actions';
import { getProfessionals } from '@/modules/professionals/actions';
import { getTurnos } from '@/modules/turnos/actions';
import AdminDashboardUI from './AdminDashboardUI';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role !== 'ADMIN') redirect('/client/dashboard');

  const params = await searchParams;

  const [usersRes, servicesRes, professionalsRes, turnosRes] = await Promise.all([
    getAllUsers(),
    getServices(),
    getProfessionals(),
    getTurnos(),
  ]);

  const users        = usersRes.success        ? usersRes.users        || [] : [];
  const services     = servicesRes.success     ? servicesRes.services   || [] : [];
  const professionals = professionalsRes.success ? professionalsRes.professionals || [] : [];
  const turnos       = turnosRes.success       ? turnosRes.turnos      || [] : [];

  return (
    <AdminDashboardUI
      session={session}
      users={users}
      services={services}
      professionals={professionals}
      turnos={turnos}
      initialTab={params.tab || 'usuarios'}
    />
  );
}
