import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAllUsers, updateAccountStatus, toggleUserRole, adminCreateUser } from '@/modules/auth/actions';
import { getServices, createService, toggleServiceActive } from '@/modules/services-offered/actions';
import { getProfessionals, createProfessional, toggleProfessionalActive } from '@/modules/professionals/actions';
import { getTurnos, createTurnoAvailability, cancelTurno, completeTurno } from '@/modules/turnos/actions';
import AdminMobileMenu from '@/app/components/AdminMobileMenu';
import AddAvailabilityForm from './AddAvailabilityForm';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; successMsg?: string; errorMsg?: string }>;
}) {
  const session = await getSession();

  // If not logged in or not admin, redirect
  if (!session) {
    redirect('/auth/login');
  }
  if (session.role !== 'ADMIN') {
    redirect('/client/dashboard');
  }

  const params = await searchParams;
  const activeTab = params.tab || 'usuarios';

  // Fetch all domain data
  const usersRes = await getAllUsers();
  const servicesRes = await getServices();
  const professionalsRes = await getProfessionals();
  const turnosRes = await getTurnos();

  const users = usersRes.success ? usersRes.users || [] : [];
  const services = servicesRes.success ? servicesRes.services || [] : [];
  const professionals = professionalsRes.success ? professionalsRes.professionals || [] : [];
  const turnos = turnosRes.success ? turnosRes.turnos || [] : [];

  // Filter pending users
  const pendingUsers = users.filter((u: any) => u.status === 'PENDING' || u.status === 'EMAIL_VERIFIED');
  const activeUsers = users.filter((u: any) => u.status !== 'PENDING' && u.status !== 'EMAIL_VERIFIED');

  // Stats
  const turnosHoy = turnos.filter((t: any) => {
    if (t.estado !== 'RESERVADO') return false;
    const today = new Date().toDateString();
    return new Date(t.fechaInicio).toDateString() === today;
  });

  // Action: update status
  async function changeStatus(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const status = formData.get('status') as any;
    const tab = formData.get('tab') as string;
    const res = await updateAccountStatus(userId, status);
    
    if (res.success) {
      redirect(`/admin/dashboard?tab=${tab}&successMsg=${encodeURIComponent('Usuario actualizado correctamente.')}`);
    } else {
      redirect(`/admin/dashboard?tab=${tab}&errorMsg=${encodeURIComponent(res.error || 'Error.')}`);
    }
  }

  // Action: toggle role
  async function toggleRole(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const currentRole = formData.get('currentRole') as any;
    const tab = formData.get('tab') as string;
    const res = await toggleUserRole(userId, currentRole);
    
    if (res.success) {
      redirect(`/admin/dashboard?tab=${tab}&successMsg=${encodeURIComponent('Rol de usuario modificado.')}`);
    } else {
      redirect(`/admin/dashboard?tab=${tab}&errorMsg=${encodeURIComponent(res.error || 'Error.')}`);
    }
  }

  // Action: create user
  async function createUser(formData: FormData) {
    'use server';
    const res = await adminCreateUser(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=usuarios&successMsg=${encodeURIComponent('Usuario creado correctamente con contraseña provisional.')}`);
    } else {
      redirect(`/admin/dashboard?tab=usuarios&errorMsg=${encodeURIComponent(res.error || 'Error al crear usuario.')}`);
    }
  }

  // Action: add service
  async function addService(formData: FormData) {
    'use server';
    const res = await createService(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=servicios&successMsg=${encodeURIComponent('Servicio creado con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=servicios&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  // Action: toggle service active
  async function toggleService(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const active = formData.get('active') === 'true';
    const res = await toggleServiceActive(id, active);
    if (res.success) {
      redirect('/admin/dashboard?tab=servicios&successMsg=Estado del servicio cambiado.');
    } else {
      redirect('/admin/dashboard?tab=servicios&errorMsg=Error.');
    }
  }

  // Action: add professional
  async function addProfessional(formData: FormData) {
    'use server';
    const res = await createProfessional(formData);
    if (res.success) {
      redirect(`/admin/dashboard?tab=profesionales&successMsg=${encodeURIComponent('Profesional agregado con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=profesionales&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  // Action: toggle professional active
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

  // Action: add availability slot
  async function addAvailability(formData: FormData) {
    'use server';
    const admin = await getSession();
    if (!admin) redirect('/auth/login');
    const res = await createTurnoAvailability(formData, admin.id);
    if (res.success) {
      redirect(`/admin/dashboard?tab=turnos&successMsg=${encodeURIComponent('Disponibilidad de turno creada con éxito.')}`);
    } else {
      redirect(`/admin/dashboard?tab=turnos&errorMsg=${encodeURIComponent(res.error || 'Error al crear.')}`);
    }
  }

  // Action: cancel appointment
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

  // Action: complete appointment
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

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-150 h-16 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Nicolas Jaled Kine Logo" width={48} height={48} className="object-contain" unoptimized />
            <div>
              <span className="font-title text-base sm:text-lg text-primary font-bold">Nicolas Jaled Kine</span>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 uppercase font-subtitle tracking-wider">Admin Panel</span>
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

        {/* Email Unverified Warning Banner */}
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
                {/* Form to create user */}
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

                {/* Lists */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Pending approvals */}
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
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    u.status === 'EMAIL_VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {u.status === 'EMAIL_VERIFIED' ? 'Email Verificado' : 'Pendiente Email'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right flex justify-end gap-2">
                                  <form action={changeStatus}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="tab" value="usuarios" />
                                    <input type="hidden" name="status" value="ACTIVE" />
                                    <button type="submit" className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-accent-light transition-all cursor-pointer">
                                      Aprobar
                                    </button>
                                  </form>
                                  <form action={changeStatus}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <input type="hidden" name="tab" value="usuarios" />
                                    <input type="hidden" name="status" value="REJECTED" />
                                    <button type="submit" className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-all cursor-pointer">
                                      Rechazar
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Active users */}
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
                              <td className="py-4 px-4">
                                <span className="font-mono text-xs font-semibold text-slate-600">{u.role}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right flex justify-end gap-2">
                                
                                <form action={changeStatus}>
                                  <input type="hidden" name="userId" value={u.id} />
                                  <input type="hidden" name="tab" value="usuarios" />
                                  <input type="hidden" name="status" value={u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'} />
                                  <button type="submit" className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                                    u.status === 'ACTIVE'
                                      ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                      : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                                  }`}>
                                    {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )
}

            {/* TAB: SERVICIOS */}
            {activeTab === 'servicios' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add */}
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

                {/* List services */}
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
                        
                        <form action={toggleService}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="active" value={s.active ? 'false' : 'true'} />
                          <button type="submit" className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                            s.active 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}>
                            {s.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFESIONALES */}
            {activeTab === 'profesionales' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add */}
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agregar Profesional</h3>
                  {services.filter((s: any) => s.active).length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-150 text-amber-800 text-xs font-semibold leading-relaxed">
                      ⚠️ <strong>No hay servicios activos:</strong><br />
                      Debés crear al menos un servicio en la pestaña "Servicios" antes de poder registrar profesionales.
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

                {/* List professionals */}
                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Profesionales Registrados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {professionals.map((p: any) => (
                      <div key={p.id} className={`p-4 rounded-xl border flex justify-between items-start text-sm shadow-sm hover:shadow transition-all ${
                        p.active 
                          ? 'bg-white border-slate-150' 
                          : 'bg-slate-50 border-slate-200 opacity-65'
                      }`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{p.name}</h4>
                            {!p.active && (
                              <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                Inactivo
                              </span>
                            )}
                          </div>
                          {p.service && (
                            <div className="text-[10px] text-primary font-bold bg-primary/5 border border-primary/10 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                              <span>🛠️ Servicio:</span>
                              <span>{p.service.name}</span>
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">{p.email || 'Sin email registrado'}</p>
                        </div>
                        
                        <form action={toggleProf}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                            p.active 
                              ? 'bg-red-50 text-red-650 hover:bg-red-100 border border-red-100' 
                              : 'bg-green-50 text-green-650 hover:bg-green-100 border border-green-100'
                          }`}>
                            {p.active ? 'Inactivar' : 'Activar'}
                          </button>
                        </form>
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

                {/* List agenda */}
                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agenda General</h3>
                  {turnos.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 italic">No hay turnos configurados aún.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {turnos.map((t: any) => (
                        <div key={t.id} className="p-4 rounded-xl border border-slate-150 bg-white flex flex-col justify-between gap-4 text-sm shadow-sm hover:shadow transition-all">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-slate-900 line-clamp-1">{t.service?.name}</span>
                              <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                                t.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                                t.estado === 'RESERVADO' ? 'bg-blue-100 text-blue-800' :
                                t.estado === 'COMPLETADO' ? 'bg-slate-100 text-slate-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {t.estado}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs text-accent font-semibold">{t.professional?.name}</p>
                              <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <span>📅</span>
                                <span>{new Date(t.fechaInicio).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Cordoba', hour12: false })} hs</span>
                              </p>
                            </div>

                            {t.client && (
                              <div className="text-[11px] text-slate-650 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                                <p>👤 <strong>{t.client.name}</strong></p>
                                <p className="text-slate-400 font-mono text-[10px]">{t.client.email}</p>
                                {t.notas && <p className="mt-1 italic text-slate-500 font-sans border-t border-slate-100 pt-1">"{t.notas}"</p>}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 justify-end border-t border-slate-50 pt-3 mt-auto">
                            {t.estado === 'RESERVADO' && (
                              <form action={completeAppointment}>
                                <input type="hidden" name="id" value={t.id} />
                                <button type="submit" className="text-xs bg-green-50 text-green-600 border border-green-150 px-2.5 py-1.5 rounded-lg font-bold hover:bg-green-100 transition-all cursor-pointer">
                                  Completar
                                </button>
                              </form>
                            )}
                            {t.estado !== 'CANCELADO' && t.estado !== 'COMPLETADO' && (
                              <form action={cancelAppointment}>
                                <input type="hidden" name="id" value={t.id} />
                                <button type="submit" className="text-xs bg-red-50 text-red-600 border border-red-150 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100 transition-all cursor-pointer">
                                  Cancelar
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
