import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getTurnos, reserveTurno, cancelTurno } from '@/modules/turnos/actions';
import { getServices } from '@/modules/services-offered/actions';
import { getProfessionals } from '@/modules/professionals/actions';
import { getActiveSubscription, initiateCheckout } from '@/modules/billing/actions';
import { getPlans } from '@/modules/plans/actions';
import { FEATURE_FLAGS } from '@/lib/flags';
import MobileMenu from '@/app/components/MobileMenu';
import AgendaFilters from './AgendaFilters';

export const dynamic = 'force-dynamic';

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; professionalId?: string; successMsg?: string; errorMsg?: string; tab?: string }>;
}) {
  const session = await getSession();

  // If not logged in or not client, redirect to login
  if (!session) {
    redirect('/auth/login');
  }
  if (session.role !== 'CLIENT') {
    redirect('/admin/dashboard');
  }

  const params = await searchParams;
  const servicesRes = await getServices();
  const professionalsRes = await getProfessionals();
  const turnosRes = await getTurnos();
  const subRes = await getActiveSubscription(session.id);
  const plansRes = await getPlans(); // fetches plans list for Phase 2

  const services = servicesRes.success ? servicesRes.services || [] : [];
  const professionals = professionalsRes.success ? professionalsRes.professionals || [] : [];
  const turnos = turnosRes.success ? turnosRes.turnos || [] : [];
  const activeSub = subRes.success ? subRes.subscription : null;
  const plans = plansRes.success ? plansRes.plans || [] : [];

  const activeTab = params.tab || 'turnos';

  // Handle reserve action in Server Action wrapper or directly
  async function bookAction(formData: FormData) {
    'use server';
    const turnoId = formData.get('turnoId') as string;
    const notes = formData.get('notes') as string;
    const client = await getSession();
    
    if (!client) redirect('/auth/login');

    const res = await reserveTurno(turnoId, client.id, notes);
    
    if (res.success) {
      redirect(`/client/dashboard?tab=turnos&successMsg=${encodeURIComponent('¡Turno reservado exitosamente! Recibirás una confirmación por correo.')}`);
    } else {
      redirect(`/client/dashboard?tab=reservar&errorMsg=${encodeURIComponent(res.error || 'No se pudo reservar el turno.')}`);
    }
  }

  // Handle cancel action
  async function cancelAction(formData: FormData) {
    'use server';
    const turnoId = formData.get('turnoId') as string;
    const res = await cancelTurno(turnoId, 'CLIENT');
    
    if (res.success) {
      redirect(`/client/dashboard?tab=turnos&successMsg=${encodeURIComponent('Turno cancelado exitosamente.')}`);
    } else {
      redirect(`/client/dashboard?tab=turnos&errorMsg=${encodeURIComponent(res.error || 'No se pudo cancelar el turno.')}`);
    }
  }

  // Handle subscribe action
  async function subscribeAction(formData: FormData) {
    'use server';
    const planId = formData.get('planId') as string;
    const client = await getSession();
    if (!client) redirect('/auth/login');
    const res = await initiateCheckout(planId, client.id);
    if (res.success && res.initPoint) {
      redirect(res.initPoint);
    } else {
      redirect(`/client/dashboard?tab=planes&errorMsg=${encodeURIComponent(res.error || 'Error al iniciar suscripción.')}`);
    }
  }

  const now = new Date();
  
  // Separate booked and available slots
  const myTurnos = turnos.filter((t: any) => t.clientId === session.id && t.estado === 'RESERVADO');
  
  // Próximos: estado RESERVADO y fecha de inicio mayor o igual a "ahora"
  const upcomingTurnos = myTurnos.filter((t: any) => new Date(t.fechaInicio) >= now);
  // Historial/Cancelados: estado CANCELADO o COMPLETADO o (RESERVADO pero fecha de inicio en el pasado)
  const historyTurnos = turnos.filter((t: any) => 
    t.clientId === session.id && 
    (t.estado === 'CANCELADO' || t.estado === 'COMPLETADO' || (t.estado === 'RESERVADO' && new Date(t.fechaInicio) < now))
  );

  // Available Turnos
  let availableTurnos = turnos.filter((t: any) => t.estado === 'DISPONIBLE');
  
  if (params.serviceId) {
    availableTurnos = availableTurnos.filter((t: any) => t.serviceId === params.serviceId);
  }
  if (params.professionalId) {
    availableTurnos = availableTurnos.filter((t: any) => t.professionalId === params.professionalId);
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
              <p className="text-[9px] text-slate-500 font-subtitle uppercase tracking-widest">Portal del Paciente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <MobileMenu />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.name}</p>
              <p className="text-xs text-slate-500">{session.email}</p>
            </div>
            <form action={async () => {
              'use server';
              const { logoutUser } = await import('@/modules/auth/actions');
              await logoutUser();
              redirect('/');
            }} className="hidden md:block">
              <button type="submit" className="text-xs font-bold text-slate-500 hover:text-red-650 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-150 px-3 py-2 rounded-lg transition-all cursor-pointer">
                Cerrar Sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner de mensajes de éxito/error */}
        {params.successMsg && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-205 text-green-800 text-sm font-semibold mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{params.successMsg}</span>
          </div>
        )}
        {params.errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-650 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{params.errorMsg}</span>
          </div>
        )}

        {/* Email Unverified Warning Banner */}
        {session.status === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm mb-6">
            <span className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><strong>Tu correo electrónico no está verificado.</strong> Por favor, verificalo usando el enlace enviado para activar completamente tu cuenta.</span>
            </span>
            <span className="text-xs font-mono bg-white px-2 py-1 border border-amber-100 rounded text-slate-500 self-start sm:self-auto">Simulado en consola</span>
          </div>
        )}

        {session.status === 'EMAIL_VERIFIED' && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold flex items-center gap-2 shadow-sm mb-6">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tu correo fue verificado. Tu cuenta está en espera de aprobación y activación manual del administrador.</span>
          </div>
        )}

        {/* Tab-based Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation (Desktop) */}
          <div className="hidden md:flex flex-col gap-2 shrink-0">
            <Link 
              href="/client/dashboard?tab=turnos" 
              className={`p-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 border ${
                activeTab === 'turnos' 
                  ? 'bg-primary text-white border-primary shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${activeTab === 'turnos' ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Mis Turnos
            </Link>
            <Link 
              href="/client/dashboard?tab=reservar" 
              className={`p-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 border ${
                activeTab === 'reservar' 
                  ? 'bg-primary text-white border-primary shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${activeTab === 'reservar' ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reservar Turno
            </Link>
            {FEATURE_FLAGS.ENABLE_PLANS_PHASE_2 && (
              <Link 
                href="/client/dashboard?tab=planes" 
                className={`p-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 border ${
                  activeTab === 'planes' 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <svg className={`w-4 h-4 transition-colors ${activeTab === 'planes' ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Suscripciones
              </Link>
            )}
            <Link 
              href="/client/dashboard?tab=cuenta" 
              className={`p-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 border ${
                activeTab === 'cuenta' 
                  ? 'bg-primary text-white border-primary shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${activeTab === 'cuenta' ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Cambiar Contraseña
            </Link>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            
            {/* MODULE 1: MIS TURNOS */}
            {activeTab === 'turnos' && (
              <div className="space-y-8">
                {/* Próximos Turnos */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-title text-xl text-primary font-bold">Turnos Programados</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">{upcomingTurnos.length} activos</span>
                  </div>

                  {upcomingTurnos.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <svg className="w-12 h-12 mx-auto text-slate-350 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-slate-500 text-sm font-semibold">No tenés turnos programados para los próximos días.</p>
                      <Link 
                        href="/client/dashboard?tab=reservar" 
                        className="inline-block mt-4 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        Reservar un turno ahora
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {upcomingTurnos.map((t: any) => (
                        <div key={t.id} className="p-5 rounded-2xl border border-slate-150 bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-title text-base font-bold text-slate-900 leading-tight block">{t.service?.name}</span>
                                <p className="text-xs text-accent font-semibold mt-0.5">{t.professional?.name}</p>
                              </div>
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">{t.duracion} min</span>
                            </div>
                            
                            <div className="pt-2 flex items-center gap-1.5 text-xs font-mono text-slate-650 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-bold text-slate-700">{new Date(t.fechaInicio).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Cordoba', hour12: false })} hs</span>
                            </div>

                            {t.notas && (
                              <p className="text-xs text-slate-500 italic bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/40">
                                <strong>Nota:</strong> "{t.notas}"
                              </p>
                            )}
                          </div>
                          
                          <div className="border-t border-slate-50 pt-3 flex justify-end">
                            <form action={cancelAction}>
                              <input type="hidden" name="turnoId" value={t.id} />
                              <button type="submit" className="text-xs font-bold text-red-650 hover:text-red-800 transition-all cursor-pointer">
                                Cancelar Turno
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de Turnos */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h2 className="font-title text-xl text-primary font-bold mb-6">Historial y Cancelaciones</h2>
                  
                  {historyTurnos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No hay registros en el historial todavía.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-150 text-slate-450 uppercase tracking-wider font-semibold">
                            <th className="py-3 px-4">Fecha</th>
                            <th className="py-3 px-4">Servicio</th>
                            <th className="py-3 px-4">Profesional</th>
                            <th className="py-3 px-4">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyTurnos.map((t: any) => {
                            let badgeClass = "bg-slate-100 text-slate-700";
                            let statusLabel = t.estado;
                            
                            if (t.estado === 'CANCELADO') {
                              badgeClass = "bg-red-50 text-red-750 border border-red-100";
                              statusLabel = "Cancelado";
                            } else if (t.estado === 'COMPLETADO' || new Date(t.fechaInicio) < now) {
                              badgeClass = "bg-green-55 text-green-800 border border-green-100";
                              statusLabel = "Completado";
                            }
                            
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/55 transition-colors">
                                <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                                  {new Date(t.fechaInicio).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Cordoba', hour12: false })} hs
                                </td>
                                <td className="py-4 px-4 font-bold text-slate-800">{t.service?.name}</td>
                                <td className="py-4 px-4 text-slate-600">{t.professional?.name}</td>
                                <td className="py-4 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODULE 2: RESERVAR TURNO */}
            {activeTab === 'reservar' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="font-title text-xl text-primary font-bold mb-4">Agendar un Nuevo Turno</h2>
                
                {/* Banner de Importes e Información de Reserva */}
                <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-150 text-slate-700 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>¡IMPORTANTE! Para Reservar</span>
                  </div>
                  <p>
                    Las reservas tienen <strong>valor individual</strong>, por lo que recomendamos adquirir algún pack antes de reservar. Podés reservar por día o consultar con el profesional para casos especiales.
                  </p>
                  <p>
                    Para las evaluaciones, <strong>pactá los horarios primero</strong> con el profesional. Cualquier duda podés consultar por WhatsApp o Instagram.
                  </p>
                </div>

                {/* Filtros */}
                <AgendaFilters 
                  services={services}
                  professionals={professionals}
                  initialServiceId={params.serviceId || ''}
                  initialProfessionalId={params.professionalId || ''}
                />

                {/* Grid de Turnos */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Turnos Disponibles</h3>
                  {availableTurnos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No se encontraron turnos disponibles con los filtros seleccionados.<br />
                      Volvé a intentar con otros filtros o consultá más adelante.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {availableTurnos.map((t: any) => (
                        <div key={t.id} className="p-5 rounded-2xl border border-slate-150 bg-white hover:border-accent hover:shadow-lg transition-all flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-title text-base font-bold text-slate-900 leading-tight block">{t.service?.name}</span>
                                <p className="text-xs text-accent font-semibold mt-0.5">{t.professional?.name}</p>
                              </div>
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">{t.duracion} min</span>
                            </div>
                            
                            {t.service?.description && (
                              <p className="text-xs text-slate-500 leading-relaxed font-sans line-clamp-2">
                                {t.service.description}
                              </p>
                            )}

                            <div className="pt-2 flex items-center gap-1.5 text-xs font-mono text-slate-650 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="font-bold text-slate-700">{new Date(t.fechaInicio).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Cordoba', hour12: false })} hs</span>
                            </div>
                          </div>
                          
                          <form action={bookAction} className="mt-2 pt-3 border-t border-slate-50 flex items-center gap-2">
                            <input type="hidden" name="turnoId" value={t.id} />
                            <input 
                              type="text" 
                              name="notes" 
                              placeholder="Notas / Motivo de consulta (opcional)..." 
                              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-accent focus:border-transparent transition-all" 
                            />
                            <button type="submit" className="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-accent-light transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0">
                              Reservar
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODULE 3: PLANES DE SUSCRIPCIÓN */}
            {activeTab === 'planes' && FEATURE_FLAGS.ENABLE_PLANS_PHASE_2 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-title text-xl text-primary font-bold">Plan de Suscripción</h2>
                  <span className="bg-green-100 text-green-800 text-[10px] font-bold px-3 py-1 rounded-full">Fase 2 Demo</span>
                </div>

                {activeSub ? (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-slate-900 text-white space-y-4 max-w-md">
                    <div>
                      <p className="text-xs text-slate-300">Plan Actualmente Activo</p>
                      <h3 className="font-title text-xl font-bold mt-1">{activeSub.plan?.nombre}</h3>
                    </div>
                    <div className="text-sm text-slate-200 font-mono space-y-1">
                      <p>Precio: ${activeSub.plan?.price}/mes</p>
                      <p>Inicio: {new Date(activeSub.fechaInicio).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                      <span className="text-accent-light font-bold">✓ Suscripto por Mercado Pago</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-slate-600 text-sm">
                      ¿Querés un plan mensual con descuento para tus entrenamientos y kinesiología? Elegí la membresía que mejor se adapte a tus necesidades. El cobro se realiza automáticamente mes a mes.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {plans.map((p: any) => (
                        <div key={p.id} className="p-6 rounded-2xl border border-slate-200 hover:border-primary bg-white shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="font-title text-lg font-bold text-slate-900">{p.nombre}</h3>
                            <p className="text-xs text-slate-500 mt-2 min-h-[40px]">{p.descripcion}</p>
                            
                            <ul className="mt-4 space-y-2">
                              {p.features?.map((f: string, i: number) => (
                                <li key={i} className="text-xs text-slate-700 flex items-center gap-2">
                                  <span className="text-green-550">✓</span> {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-primary text-base">${p.price}/mes</span>
                            <form action={subscribeAction}>
                              <input type="hidden" name="planId" value={p.id} />
                              <button type="submit" className="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-accent-light shadow transition-all cursor-pointer">
                                Contratar
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODULE 4: CAMBIAR CONTRASEÑA */}
            {activeTab === 'cuenta' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 max-w-md">
                <h2 className="font-title text-xl text-primary font-bold mb-2">Seguridad de la Cuenta</h2>
                <p className="text-xs text-slate-550 mb-6">Actualizá tu contraseña para mantener tu cuenta segura.</p>
                
                <form action={async (formData) => {
                  'use server';
                  const { changeUserPassword } = await import('@/modules/auth/actions');
                  const client = await getSession();
                  if (!client) redirect('/auth/login');
                  const res = await changeUserPassword(formData, client.id);
                  if (res.success) {
                    redirect('/client/dashboard?tab=cuenta&successMsg=Contraseña cambiada exitosamente.');
                  } else {
                    redirect(`/client/dashboard?tab=cuenta&errorMsg=${encodeURIComponent(res.error || 'Error al cambiar contraseña.')}`);
                  }
                }} className="space-y-4">
                  <div>
                    <label htmlFor="curr-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contraseña Actual</label>
                    <input id="curr-pass" name="currentPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nueva Contraseña</label>
                    <input id="new-pass" name="newPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                  </div>
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
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
