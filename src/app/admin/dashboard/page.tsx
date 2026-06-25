import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { getAllUsers, updateAccountStatus, toggleUserRole, adminCreateUser, deleteUser } from '@/modules/auth/actions';
import { getServices, createService, toggleServiceActive, deleteService } from '@/modules/services-offered/actions';
import { getProfessionals, createProfessional, toggleProfessionalActive, deleteProfessional } from '@/modules/professionals/actions';
import { getTurnos, createTurnoAvailability, cancelTurno, completeTurno, deleteTurno } from '@/modules/turnos/actions';
import { getAdminSubscriptions, adminAssignPlan, adminAdjustCredits, adminConfirmPayment } from '@/modules/billing/actions';
import { getPlans } from '@/modules/plans/actions';
import AdminMobileMenu from '@/app/components/AdminMobileMenu';
import AddAvailabilityForm from './AddAvailabilityForm';
import DeleteButton from '@/app/components/DeleteButton';
import AdminCalendar from './AdminCalendar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; successMsg?: string; errorMsg?: string }>;
}) {
  const session = await getSession();

  if (!session) redirect('/auth/login');
  if (session.role !== 'ADMIN') redirect('/client/dashboard');

  const params = await searchParams;
  const activeTab = params.tab || 'usuarios';

  const [usersRes, servicesRes, professionalsRes, turnosRes, subsRes, plansRes] = await Promise.all([
    getAllUsers(),
    getServices(),
    getProfessionals(),
    getTurnos(),
    getAdminSubscriptions(),
    getPlans(),
  ]);

  const users         = usersRes.success        ? usersRes.users        || [] : [];
  const services      = servicesRes.success     ? servicesRes.services   || [] : [];
  const professionals = professionalsRes.success ? professionalsRes.professionals || [] : [];
  const turnos        = turnosRes.success        ? turnosRes.turnos      || [] : [];
  const allSubs       = subsRes.success          ? (subsRes as any).subscriptions || [] : [];
  const plans         = plansRes.success         ? plansRes.plans        || [] : [];

  const now = new Date();
  // Map userId → active subscription (not expired)
  const activeSubByUser = new Map<string, any>();
  for (const s of allSubs) {
    if (s.estado === 'ACTIVE' && (!s.fechaFin || new Date(s.fechaFin) > now)) {
      if (!activeSubByUser.has(s.userId)) activeSubByUser.set(s.userId, s);
    }
  }
  // Pending payment subscriptions (waiting for manual confirmation)
  const pendingPaymentSubs = allSubs.filter((s: any) => s.estado === 'PENDING_PAYMENT');

  const pendingUsers = users.filter((u: any) => u.status === 'PENDING' || u.status === 'EMAIL_VERIFIED');
  const activeUsers  = users.filter((u: any) => u.status !== 'PENDING' && u.status !== 'EMAIL_VERIFIED');

  const turnosHoy = turnos.filter((t: any) => {
    if (t.estado !== 'RESERVADO') return false;
    return new Date(t.fechaInicio).toDateString() === new Date().toDateString();
  });

  // ── Server Actions ───────────────────────────────────────────────────────────

  async function changeStatus(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const status = formData.get('status') as any;
    const tab    = formData.get('tab') as string;
    const res = await updateAccountStatus(userId, status);
    if (res.success) {
      redirect(`/admin/dashboard?tab=${tab}&successMsg=${encodeURIComponent('Usuario actualizado correctamente.')}`);
    } else {
      redirect(`/admin/dashboard?tab=${tab}&errorMsg=${encodeURIComponent(res.error || 'Error.')}`);
    }
  }

  async function createUser(formData: FormData) {
    'use server';
    const res = await adminCreateUser(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=usuarios&successMsg=${encodeURIComponent('Usuario creado correctamente con contraseña provisional.')}`);
    } else {
      redirect(`/admin/dashboard?tab=usuarios&errorMsg=${encodeURIComponent(res.error || 'Error al crear usuario.')}`);
    }
  }

  async function addService(formData: FormData) {
    'use server';
    const res = await createService(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=servicios&successMsg=${encodeURIComponent('Servicio creado con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=servicios&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  async function toggleService(formData: FormData) {
    'use server';
    const id     = formData.get('id') as string;
    const active = formData.get('active') === 'true';
    const res = await toggleServiceActive(id, active);
    if (res.success) {
      redirect('/admin/dashboard?tab=servicios&successMsg=Estado del servicio cambiado.');
    } else {
      redirect('/admin/dashboard?tab=servicios&errorMsg=Error.');
    }
  }

  async function addProfessional(formData: FormData) {
    'use server';
    const res = await createProfessional(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=profesionales&successMsg=${encodeURIComponent('Profesional agregado con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=profesionales&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  async function toggleProf(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const res = await toggleProfessionalActive(id);
    if (res.success) {
      redirect('/admin/dashboard?tab=profesionales&successMsg=Estado del profesional cambiado.');
    } else {
      redirect('/admin/dashboard?tab=profesionales&errorMsg=Error.');
    }
  }

  async function addAvailability(formData: FormData) {
    'use server';
    const admin = await getSession();
    if (!admin) redirect('/auth/login');
    const res = await createTurnoAvailability(formData, admin.id);
    if (res.success) {
      redirect(`/admin/dashboard?tab=turnos&successMsg=${encodeURIComponent(res.message || 'Disponibilidad creada con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=turnos&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  async function cancelAppointment(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const res = await cancelTurno(id, 'ADMIN');
    if (res.success) {
      redirect('/admin/dashboard?tab=turnos&successMsg=Turno cancelado.');
    } else {
      redirect('/admin/dashboard?tab=turnos&errorMsg=Error al cancelar.');
    }
  }

  async function completeAppointment(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const res = await completeTurno(id);
    if (res.success) {
      redirect('/admin/dashboard?tab=turnos&successMsg=Turno completado.');
    } else {
      redirect('/admin/dashboard?tab=turnos&errorMsg=Error.');
    }
  }

  async function removeUser(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteUser(id);
    revalidatePath('/admin/dashboard');
  }

  async function removeService(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteService(id);
    revalidatePath('/admin/dashboard');
  }

  async function removeProf(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteProfessional(id);
    revalidatePath('/admin/dashboard');
  }

  async function removeTurno(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteTurno(id);
    revalidatePath('/admin/dashboard');
  }

  async function assignPlanAction(formData: FormData) {
    'use server';
    const userId       = formData.get('userId') as string;
    const planId       = formData.get('planId') as string;
    const customRaw    = formData.get('customCredits') as string;
    const customCredits = customRaw ? parseInt(customRaw) : undefined;
    const res = await adminAssignPlan(userId, planId, customCredits);
    if (res.success) {
      redirect('/admin/dashboard?tab=usuarios&successMsg=Plan asignado correctamente.');
    } else {
      redirect(`/admin/dashboard?tab=usuarios&errorMsg=${encodeURIComponent(res.error || 'Error al asignar plan.')}`);
    }
  }

  async function adjustCreditsAction(formData: FormData) {
    'use server';
    const subscriptionId = formData.get('subscriptionId') as string;
    const credits        = parseInt(formData.get('credits') as string);
    const res = await adminAdjustCredits(subscriptionId, credits);
    if (res.success) {
      redirect('/admin/dashboard?tab=usuarios&successMsg=Sesiones ajustadas correctamente.');
    } else {
      redirect(`/admin/dashboard?tab=usuarios&errorMsg=${encodeURIComponent(res.error || 'Error al ajustar sesiones.')}`);
    }
  }

  async function confirmPaymentAction(formData: FormData) {
    'use server';
    const subscriptionId = formData.get('subscriptionId') as string;
    const res = await adminConfirmPayment(subscriptionId);
    if (res.success) {
      redirect('/admin/dashboard?tab=usuarios&successMsg=Pago confirmado. Plan activado correctamente.');
    } else {
      redirect(`/admin/dashboard?tab=usuarios&errorMsg=${encodeURIComponent(res.error || 'Error al confirmar pago.')}`);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-150 h-16 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Nicolas Jaled Kine Logo" width={48} height={48} className="object-contain" unoptimized />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-title text-base sm:text-lg text-primary font-bold">Nicolas Jaled Kine</span>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-subtitle tracking-wider whitespace-nowrap">Admin Panel</span>
              <Link
                href="/professional/evaluaciones"
                className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap hover:bg-accent/20 transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dinamometrías
              </Link>
              <Link
                href="/professional/ficha"
                className="bg-green-500/10 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap hover:bg-green-500/20 transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Fichas
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <AdminMobileMenu />
            <span className="text-sm font-semibold text-slate-800 hidden sm:inline">{session.name}</span>
            <form action={async () => {
              'use server';
              const { logoutUser } = await import('@/modules/auth/actions');
              await logoutUser();
              redirect('/');
            }} className="hidden sm:block">
              <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Messages */}
        {params.successMsg && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold">
            ✓ {params.successMsg}
          </div>
        )}
        {params.errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold">
            ⚠️ {params.errorMsg}
          </div>
        )}

        {session.status === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span><strong>Tu correo electrónico de administrador no está verificado.</strong> Por favor, verificalo usando el enlace de verificación enviado.</span>
            </span>
            <span className="text-xs font-mono bg-white px-2 py-1 border border-amber-100 rounded text-slate-500 self-start sm:self-auto">Simulado en consola</span>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aprobaciones Pendientes</p>
            <p className="mt-2 text-3xl font-title font-bold text-slate-900">{pendingUsers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reservados Hoy</p>
            <p className="mt-2 text-3xl font-title font-bold text-accent">{turnosHoy.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Servicios Activos</p>
            <p className="mt-2 text-3xl font-title font-bold text-primary">{services.filter((s: any) => s.active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profesionales Activos</p>
            <p className="mt-2 text-3xl font-title font-bold text-secondary">{professionals.filter((p: any) => p.active).length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="hidden md:flex border-b border-slate-100 bg-slate-50/50">
            {['usuarios', 'servicios', 'profesionales', 'turnos', 'configuracion'].map((tab) => (
              <Link
                key={tab}
                href={`/admin/dashboard?tab=${tab}`}
                className={`flex-1 text-center py-4 text-sm font-bold font-title border-b-2 capitalize transition-all ${
                  activeTab === tab
                    ? 'border-primary text-primary bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/20'
                }`}
              >
                {tab}
              </Link>
            ))}
          </div>

          <div className="p-6">

            {/* TAB: USUARIOS */}
            {activeTab === 'usuarios' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit">
                  <h3 className="font-title text-md text-primary font-bold mb-4 font-sans">Crear Nuevo Usuario</h3>
                  <form action={createUser} className="space-y-4">
                    <div>
                      <label htmlFor="u-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre Completo</label>
                      <input id="u-name" name="name" type="text" required placeholder="Ej. Pedro Picapiedra" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label htmlFor="u-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email</label>
                      <input id="u-email" name="email" type="email" required placeholder="pedro@gmail.com" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="u-role" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Rol</label>
                        <select id="u-role" name="role" required className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none">
                          <option value="CLIENT">Paciente</option>
                          <option value="PROFESSIONAL">Profesional</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="u-provpass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pass Provisional</label>
                        <input id="u-provpass" name="provisionalPassword" type="text" required placeholder="njk123" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer">
                      Crear Cuenta
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div>
                    <h3 className="font-title text-md text-primary font-bold mb-4">Solicitudes Pendientes de Aprobación</h3>
                    {pendingUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 italic">No hay solicitudes pendientes.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                          <thead>
                            <tr className="text-xs font-bold text-slate-400 uppercase">
                              <th className="py-3 px-4">Nombre</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Estado</th>
                              <th className="py-3 px-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {pendingUsers.map((u: any) => (
                              <tr key={u.id} className="hover:bg-slate-50/50">
                                <td className="py-4 px-4 font-semibold text-slate-900">{u.name}</td>
                                <td className="py-4 px-4 text-slate-600">{u.email}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === 'EMAIL_VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {u.status === 'EMAIL_VERIFIED' ? 'Email Verificado' : 'Pendiente Email'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right flex justify-end gap-2">
                                  <form action={changeStatus}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="tab" value="usuarios" />
                                    <input type="hidden" name="status" value="ACTIVE" />
                                    <button type="submit" className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-accent-light transition-all cursor-pointer">Aprobar</button>
                                  </form>
                                  <form action={changeStatus}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="tab" value="usuarios" />
                                    <input type="hidden" name="status" value="REJECTED" />
                                    <button type="submit" className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-all cursor-pointer">Rechazar</button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-title text-md text-primary font-bold mb-4 font-sans border-t border-slate-100 pt-8">Gestión de Usuarios</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead>
                          <tr className="text-xs font-bold text-slate-400 uppercase">
                            <th className="py-3 px-4">Nombre</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Rol</th>
                            <th className="py-3 px-4">Estado</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activeUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="py-4 px-4 font-semibold text-slate-900">{u.name}</td>
                              <td className="py-4 px-4 text-slate-600">{u.email}</td>
                              <td className="py-4 px-4"><span className="font-mono text-xs font-semibold text-slate-600">{u.role}</span></td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
                              </td>
                              <td className="py-4 px-4 text-right flex justify-end items-center gap-2">
                                <form action={changeStatus}>
                                  <input type="hidden" name="userId" value={u.id} />
                                  <input type="hidden" name="tab" value="usuarios" />
                                  <input type="hidden" name="status" value={u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'} />
                                  <button type="submit" className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${u.status === 'ACTIVE' ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'}`}>
                                    {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                                  </button>
                                </form>
                                <DeleteButton action={removeUser} id={u.id} confirmMessage="¿Estás seguro de eliminar este usuario?" title="Eliminar Usuario" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagos Pendientes de Confirmación */}
                  {pendingPaymentSubs.length > 0 && (
                    <div className="border-t border-slate-100 pt-8">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-title text-md text-primary font-bold">Pagos Pendientes</h3>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingPaymentSubs.length}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Estos clientes solicitaron un plan. Confirmá el pago una vez que recibas el dinero (efectivo, transferencia, etc.).</p>
                      <div className="space-y-3">
                        {pendingPaymentSubs.map((sub: any) => {
                          const user = users.find((u: any) => u.id === sub.userId);
                          const plan = plans.find((p: any) => p.id === sub.planId);
                          return (
                            <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                                  <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{user?.name ?? 'Usuario'}</p>
                                  <p className="text-xs text-slate-500 truncate">{user?.email} · {plan?.nombre ?? sub.planId}</p>
                                  <p className="text-xs text-amber-700 font-semibold mt-0.5">
                                    {plan?.price != null ? `$${plan.price.toLocaleString('es-AR')}` : 'Precio no disponible'} · {plan?.limiteTurnos ?? '?'} sesiones
                                  </p>
                                </div>
                              </div>
                              <form action={confirmPaymentAction}>
                                <input type="hidden" name="subscriptionId" value={sub.id} />
                                <button
                                  type="submit"
                                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Confirmar pago
                                </button>
                              </form>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Planes y Sesiones */}
                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="font-title text-md text-primary font-bold mb-4">Planes y Sesiones</h3>
                    <div className="space-y-3">
                      {activeUsers.filter((u: any) => u.role === 'CLIENT').map((u: any) => {
                        const sub = activeSubByUser.get(u.id);
                        return (
                          <div key={u.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                            {/* User info + current plan */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                              {sub ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-600">{sub.plan?.nombre}</span>
                                  <span className="bg-accent/15 text-accent text-xs font-bold px-2.5 py-1 rounded-full">
                                    {sub.turnosRestantes} sesión{sub.turnosRestantes !== 1 ? 'es' : ''}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Sin plan activo</span>
                              )}
                            </div>

                            {/* Forms row */}
                            <div className="flex flex-wrap gap-3 items-end">
                              {/* Assign plan */}
                              <form action={assignPlanAction} className="flex items-end gap-2 flex-wrap">
                                <input type="hidden" name="userId" value={u.id} />
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asignar Plan</label>
                                  <select name="planId" required className="text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                                    {(plans as any[]).filter((p: any) => p.activo).map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.nombre} ({p.limiteTurnos} ses.)</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Créditos custom</label>
                                  <input
                                    name="customCredits"
                                    type="number"
                                    min="0"
                                    placeholder="Def. del plan"
                                    className="text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <button type="submit" className="text-xs px-3 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all cursor-pointer">
                                  Asignar
                                </button>
                              </form>

                              {/* Adjust existing credits */}
                              {sub && (
                                <form action={adjustCreditsAction} className="flex items-end gap-2">
                                  <input type="hidden" name="subscriptionId" value={sub.id} />
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ajustar sesiones</label>
                                    <input
                                      name="credits"
                                      type="number"
                                      min="0"
                                      defaultValue={sub.turnosRestantes}
                                      className="text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white w-20 focus:outline-none focus:ring-1 focus:ring-accent"
                                    />
                                  </div>
                                  <button type="submit" className="text-xs px-3 py-2 bg-accent text-white rounded-lg font-bold hover:bg-accent-light transition-all cursor-pointer">
                                    Guardar
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {activeUsers.filter((u: any) => u.role === 'CLIENT').length === 0 && (
                        <p className="text-sm text-slate-400 italic">No hay pacientes activos.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: SERVICIOS */}
            {activeTab === 'servicios' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agregar Nuevo Servicio</h3>
                  <form action={addService} className="space-y-4">
                    <div>
                      <label htmlFor="srv-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre</label>
                      <input id="srv-name" name="name" type="text" required placeholder="Ej. RPG Kinesiología" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label htmlFor="srv-desc" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Descripción</label>
                      <textarea id="srv-desc" name="description" rows={3} placeholder="Detalles del servicio..." className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="srv-price" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Precio ($)</label>
                        <input id="srv-price" name="price" type="number" required placeholder="18000" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label htmlFor="srv-dur" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Duración (min)</label>
                        <input id="srv-dur" name="duration" type="number" required placeholder="60" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer">
                      Guardar Servicio
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Servicios Configurados</h3>
                  <div className="space-y-4">
                    {services.map((s: any) => (
                      <div key={s.id} className="p-4 rounded-xl border border-slate-150 bg-white flex justify-between items-center text-sm shadow-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{s.name}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.duration} min</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{s.description || 'Sin descripción'}</p>
                          <p className="text-xs font-bold text-primary mt-2">Precio: ${s.price.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <form action={toggleService}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="active" value={s.active ? 'false' : 'true'} />
                            <button type="submit" className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${s.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                              {s.active ? 'Desactivar' : 'Activar'}
                            </button>
                          </form>
                          <DeleteButton action={removeService} id={s.id} confirmMessage="¿Estás seguro de eliminar este servicio? Se eliminarán todos sus turnos asociados." title="Eliminar Servicio" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFESIONALES */}
            {activeTab === 'profesionales' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agregar Profesional</h3>
                  {services.filter((s: any) => s.active).length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-150 text-amber-800 text-xs font-semibold leading-relaxed">
                      ⚠️ <strong>No hay servicios activos:</strong><br />
                      Debés crear al menos un servicio en la pestaña &ldquo;Servicios&rdquo; antes de poder registrar profesionales.
                    </div>
                  ) : (
                    <form action={addProfessional} className="space-y-4">
                      <div>
                        <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre Completo</label>
                        <input id="prof-name" name="name" type="text" required placeholder="Lic. Franco Colapinto" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label htmlFor="prof-service" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Servicio Asociado</label>
                        <select id="prof-service" name="serviceId" required className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none">
                          <option value="">Seleccione un servicio</option>
                          {services.filter((s: any) => s.active).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email (Opcional)</label>
                        <input id="prof-email" name="email" type="email" placeholder="franco@njk.com" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <button type="submit" className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer">
                        Agregar Profesional
                      </button>
                    </form>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Profesionales Registrados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {professionals.map((p: any) => (
                      <div key={p.id} className={`p-4 rounded-xl border flex flex-col gap-3 text-sm shadow-sm hover:shadow transition-all ${p.active ? 'bg-white border-slate-150' : 'bg-slate-50 border-slate-200 opacity-65'}`}>
                        {/* Content */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{p.name}</h4>
                            {!p.active && <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">Inactivo</span>}
                          </div>
                          {p.service && (
                            <div className="text-[10px] text-primary font-semibold bg-primary/5 border border-primary/15 px-2 py-0.5 rounded-md w-fit">
                              <span className="text-primary/50 font-medium uppercase tracking-wide">Servicio · </span>{p.service.name}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400">{p.email || 'Sin email registrado'}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                          <form action={toggleProf}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              title={p.active ? 'Inactivar profesional' : 'Activar profesional'}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
                                p.active
                                  ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                              </svg>
                              {p.active ? 'Inactivar' : 'Activar'}
                            </button>
                          </form>
                          <DeleteButton action={removeProf} id={p.id} confirmMessage="¿Estás seguro de eliminar este profesional? Se eliminarán todos sus turnos asignados." title="Eliminar Profesional" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TURNOS */}
            {activeTab === 'turnos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <AddAvailabilityForm
                    services={services.filter((s: any) => s.active)}
                    professionals={professionals.filter((p: any) => p.active)}
                    addAvailabilityAction={addAvailability}
                  />
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agenda General</h3>
                  <AdminCalendar
                    turnos={turnos.map((t: any) => ({
                      id: t.id,
                      fechaInicio: new Date(t.fechaInicio).toISOString(),
                      duracion: t.duracion,
                      estado: t.estado,
                      notas: t.notas ?? null,
                      service: { name: t.service?.name ?? '' },
                      professional: { name: t.professional?.name ?? '' },
                      client: t.client ? { name: t.client.name, email: t.client.email } : null,
                    }))}
                    completeAction={completeAppointment}
                    cancelAction={cancelAppointment}
                    deleteAction={removeTurno}
                  />
                </div>
              </div>
            )}

            {/* TAB: CONFIGURACION */}
            {activeTab === 'configuracion' && (
              <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-title text-md text-primary font-bold mb-4 font-sans">Cambiar Contraseña</h3>
                <form action={async (formData) => {
                  'use server';
                  const { changeUserPassword } = await import('@/modules/auth/actions');
                  const admin = await getSession();
                  if (!admin) redirect('/auth/login');
                  const res = await changeUserPassword(formData, admin.id);
                  if (res.success) {
                    redirect('/admin/dashboard?tab=configuracion&successMsg=Contraseña cambiada exitosamente.');
                  } else {
                    redirect(`/admin/dashboard?tab=configuracion&errorMsg=${encodeURIComponent(res.error || 'Error al cambiar contraseña.')}`);
                  }
                }} className="space-y-4">
                  <div>
                    <label htmlFor="adm-curr-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contraseña Actual</label>
                    <input id="adm-curr-pass" name="currentPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label htmlFor="adm-new-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nueva Contraseña</label>
                    <input id="adm-new-pass" name="newPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-primary text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-secondary transition-all cursor-pointer">
                    Actualizar Contraseña
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
