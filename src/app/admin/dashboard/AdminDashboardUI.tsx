'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AddAvailabilityForm from './AddAvailabilityForm';
import {
  saChangeStatus, saCreateUser, saDeleteUser,
  saAddService, saToggleService, saDeleteService,
  saAddProfessional, saToggleProfessional, saDeleteProfessional,
  saAddAvailability, saCancelAppointment, saCompleteAppointment, saDeleteTurno,
  saChangePassword, saLogout,
} from './serverActions';

interface Props {
  session: { id: string; name: string; email: string; role: string; status: string };
  users: any[];
  services: any[];
  professionals: any[];
  turnos: any[];
  initialTab?: string;
}

type MsgState = { type: 'success' | 'error'; text: string } | null;

export default function AdminDashboardUI({ session, users, services, professionals, turnos, initialTab = 'usuarios' }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [msg, setMsg] = useState<MsgState>(null);
  const [isPending, startTransition] = useTransition();

  const pendingUsers = users.filter((u) => u.status === 'PENDING' || u.status === 'EMAIL_VERIFIED');
  const activeUsers = users.filter((u) => u.status !== 'PENDING' && u.status !== 'EMAIL_VERIFIED');
  const turnosHoy = turnos.filter((t) => {
    if (t.estado !== 'RESERVADO') return false;
    return new Date(t.fechaInicio).toDateString() === new Date().toDateString();
  });

  function act(fn: () => Promise<{ success: boolean; error?: string; message?: string }>, successText: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.success) {
        setMsg({ type: 'success', text: res.message || successText });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Error inesperado.' });
      }
      setTimeout(() => setMsg(null), 4000);
    });
  }

  const tabs = ['usuarios', 'servicios', 'profesionales', 'turnos', 'configuracion'];

  // ─── Form refs ───────────────────────────────────────────────────────────────
  const createUserRef = useRef<HTMLFormElement>(null);
  const addServiceRef = useRef<HTMLFormElement>(null);
  const addProfRef = useRef<HTMLFormElement>(null);
  const changePassRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-150 h-16 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="NJK Logo" width={48} height={48} className="object-contain" unoptimized />
            <div>
              <span className="font-title text-base sm:text-lg text-primary font-bold">Nicolas Jaled Kine</span>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 uppercase font-subtitle tracking-wider">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile tab menu */}
            <div className="md:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="text-sm font-bold text-primary border border-primary/20 rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer capitalize"
              >
                {tabs.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <span className="text-sm font-semibold text-slate-800 hidden sm:inline">{session.name}</span>
            <button
              onClick={() => act(saLogout, 'Sesión cerrada.')}
              disabled={isPending}
              className="hidden sm:block bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Toast messages */}
        {msg && (
          <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
            msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {msg.type === 'success' ? '✓' : '⚠️'} {msg.text}
          </div>
        )}

        {/* Pending badge */}
        {session.status === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold shadow-sm">
            ⚠️ <strong>Tu correo electrónico no está verificado.</strong> Revisá tu bandeja de entrada.
          </div>
        )}

        {/* Loading bar */}
        {isPending && (
          <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[progress_1s_ease-in-out_infinite]" style={{ width: '60%' }} />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Aprobaciones Pendientes', value: pendingUsers.length, color: 'text-slate-900' },
            { label: 'Reservados Hoy', value: turnosHoy.length, color: 'text-accent' },
            { label: 'Servicios Activos', value: services.filter((s) => s.active).length, color: 'text-primary' },
            { label: 'Profesionales Activos', value: professionals.filter((p) => p.active).length, color: 'text-secondary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`mt-2 text-3xl font-title font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          {/* Desktop tabs */}
          <div className="hidden md:flex border-b border-slate-100 bg-slate-50/50">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-center py-4 text-sm font-bold font-title border-b-2 capitalize transition-all ${
                  activeTab === tab
                    ? 'border-primary text-primary bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── USUARIOS ─────────────────────────────────── */}
            {activeTab === 'usuarios' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Crear Nuevo Usuario</h3>
                  <form ref={createUserRef} onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    act(() => saCreateUser(fd), 'Usuario creado correctamente.');
                    createUserRef.current?.reset();
                  }} className="space-y-4">
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
                    <button type="submit" disabled={isPending} className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer disabled:opacity-60">
                      {isPending ? 'Procesando...' : 'Crear Cuenta'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  {/* Pending */}
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
                            {pendingUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/50">
                                <td className="py-4 px-4 font-semibold text-slate-900">{u.name}</td>
                                <td className="py-4 px-4 text-slate-600">{u.email}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === 'EMAIL_VERIFIED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {u.status === 'EMAIL_VERIFIED' ? 'Email Verificado' : 'Pendiente Email'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => act(() => saChangeStatus(u.id, 'ACTIVE'), 'Usuario aprobado.')} disabled={isPending} className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-accent-light transition-all cursor-pointer disabled:opacity-50">Aprobar</button>
                                    <button onClick={() => act(() => saChangeStatus(u.id, 'REJECTED'), 'Usuario rechazado.')} disabled={isPending} className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50">Rechazar</button>
                                  </div>
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
                    <h3 className="font-title text-md text-primary font-bold mb-4 border-t border-slate-100 pt-8">Gestión de Usuarios</h3>
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
                          {activeUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="py-4 px-4 font-semibold text-slate-900">{u.name}</td>
                              <td className="py-4 px-4 text-slate-600">{u.email}</td>
                              <td className="py-4 px-4"><span className="font-mono text-xs font-semibold text-slate-600">{u.role}</span></td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end items-center gap-2">
                                  <button onClick={() => act(() => saChangeStatus(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'), u.status === 'ACTIVE' ? 'Usuario suspendido.' : 'Usuario activado.')} disabled={isPending} className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer disabled:opacity-50 ${u.status === 'ACTIVE' ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'}`}>
                                    {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                                  </button>
                                  <button onClick={() => { if (confirm('¿Estás seguro de eliminar este usuario?')) act(() => saDeleteUser(u.id), 'Usuario eliminado.'); }} disabled={isPending} title="Eliminar Usuario" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SERVICIOS ────────────────────────────────── */}
            {activeTab === 'servicios' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agregar Nuevo Servicio</h3>
                  <form ref={addServiceRef} onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    act(() => saAddService(fd), 'Servicio creado con éxito.');
                    addServiceRef.current?.reset();
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="srv-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre</label>
                      <input id="srv-name" name="name" type="text" required placeholder="Ej. RPG Kinesiología" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label htmlFor="srv-desc" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Descripción</label>
                      <textarea id="srv-desc" name="description" rows={3} placeholder="Detalles del servicio..." className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
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
                    <button type="submit" disabled={isPending} className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer disabled:opacity-60">
                      {isPending ? 'Guardando...' : 'Guardar Servicio'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Servicios Configurados</h3>
                  <div className="space-y-4">
                    {services.map((s) => (
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
                          <button onClick={() => act(() => saToggleService(s.id, s.active), s.active ? 'Servicio desactivado.' : 'Servicio activado.')} disabled={isPending} className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer disabled:opacity-50 ${s.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                            {s.active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button onClick={() => { if (confirm('¿Estás seguro de eliminar este servicio? Se eliminarán todos sus turnos asociados.')) act(() => saDeleteService(s.id), 'Servicio eliminado.'); }} disabled={isPending} title="Eliminar Servicio" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROFESIONALES ────────────────────────────── */}
            {activeTab === 'profesionales' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agregar Profesional</h3>
                  {services.filter((s) => s.active).length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-150 text-amber-800 text-xs font-semibold leading-relaxed">
                      ⚠️ <strong>No hay servicios activos:</strong><br />
                      Debés crear al menos un servicio en la pestaña &ldquo;Servicios&rdquo; antes de poder registrar profesionales.
                    </div>
                  ) : (
                    <form ref={addProfRef} onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      act(() => saAddProfessional(fd), 'Profesional agregado con éxito.');
                      addProfRef.current?.reset();
                    }} className="space-y-4">
                      <div>
                        <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre Completo</label>
                        <input id="prof-name" name="name" type="text" required placeholder="Lic. Franco Colapinto" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label htmlFor="prof-service" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Servicio Asociado</label>
                        <select id="prof-service" name="serviceId" required className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none">
                          <option value="">Seleccione un servicio</option>
                          {services.filter((s) => s.active).map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email (Opcional)</label>
                        <input id="prof-email" name="email" type="email" placeholder="franco@njk.com" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <button type="submit" disabled={isPending} className="w-full bg-accent text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-accent-light transition-all cursor-pointer disabled:opacity-60">
                        {isPending ? 'Guardando...' : 'Agregar Profesional'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Profesionales Registrados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {professionals.map((p) => (
                      <div key={p.id} className={`p-4 rounded-xl border flex justify-between items-start text-sm shadow-sm hover:shadow transition-all ${p.active ? 'bg-white border-slate-150' : 'bg-slate-50 border-slate-200 opacity-65'}`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{p.name}</h4>
                            {!p.active && <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">Inactivo</span>}
                          </div>
                          {p.service && (
                            <div className="text-[10px] text-primary font-bold bg-primary/5 border border-primary/10 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                              <span>🛠️ Servicio:</span><span>{p.service.name}</span>
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400">{p.email || 'Sin email registrado'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => act(() => saToggleProfessional(p.id), p.active ? 'Profesional inactivado.' : 'Profesional activado.')} disabled={isPending} className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-50 ${p.active ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'}`}>
                            {p.active ? 'Inactivar' : 'Activar'}
                          </button>
                          <button onClick={() => { if (confirm('¿Estás seguro de eliminar este profesional? Se eliminarán todos sus turnos asignados.')) act(() => saDeleteProfessional(p.id), 'Profesional eliminado.'); }} disabled={isPending} title="Eliminar Profesional" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TURNOS ───────────────────────────────────── */}
            {activeTab === 'turnos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <AddAvailabilityForm
                    services={services.filter((s) => s.active)}
                    professionals={professionals.filter((p) => p.active)}
                    addAvailabilityAction={saAddAvailability}
                    onSuccess={(msg) => { setMsg({ type: 'success', text: msg }); router.refresh(); setTimeout(() => setMsg(null), 4000); }}
                    onError={(err) => { setMsg({ type: 'error', text: err }); setTimeout(() => setMsg(null), 4000); }}
                  />
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-title text-md text-primary font-bold mb-4">Agenda General</h3>
                  {turnos.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 italic">No hay turnos configurados aún.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {turnos.map((t) => (
                        <div key={t.id} className="p-4 rounded-xl border border-slate-150 bg-white flex flex-col gap-3 text-sm shadow-sm hover:shadow transition-all">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-slate-900 line-clamp-1">{t.service?.name}</span>
                              <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                                t.estado === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                                t.estado === 'RESERVADO' ? 'bg-blue-100 text-blue-800' :
                                t.estado === 'COMPLETADO' ? 'bg-slate-100 text-slate-800' : 'bg-red-100 text-red-800'
                              }`}>{t.estado}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-accent font-semibold">{t.professional?.name}</p>
                              <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <span>📅</span>
                                <span>{new Date(t.fechaInicio).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Cordoba', hour12: false })} hs</span>
                              </p>
                            </div>
                            {t.client && (
                              <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
                                <p>👤 <strong>{t.client.name}</strong></p>
                                <p className="text-slate-400 font-mono text-[10px]">{t.client.email}</p>
                                {t.notas && <p className="mt-1 italic text-slate-500 border-t border-slate-100 pt-1">&ldquo;{t.notas}&rdquo;</p>}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 items-center justify-end border-t border-slate-50 pt-2">
                            {t.estado === 'RESERVADO' && (
                              <button onClick={() => act(() => saCompleteAppointment(t.id), 'Turno completado.')} disabled={isPending} className="text-xs bg-green-50 text-green-600 border border-green-150 px-2.5 py-1.5 rounded-lg font-bold hover:bg-green-100 transition-all cursor-pointer disabled:opacity-50">
                                Completar
                              </button>
                            )}
                            {t.estado !== 'CANCELADO' && t.estado !== 'COMPLETADO' && (
                              <button onClick={() => act(() => saCancelAppointment(t.id), 'Turno cancelado.')} disabled={isPending} className="text-xs bg-red-50 text-red-600 border border-red-150 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50">
                                Cancelar
                              </button>
                            )}
                            <button onClick={() => { if (confirm('¿Estás seguro de eliminar este turno?')) act(() => saDeleteTurno(t.id), 'Turno eliminado.'); }} disabled={isPending} title="Eliminar Turno" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all cursor-pointer disabled:opacity-50">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CONFIGURACION ────────────────────────────── */}
            {activeTab === 'configuracion' && (
              <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-title text-md text-primary font-bold mb-4">Cambiar Contraseña</h3>
                <form ref={changePassRef} onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  act(() => saChangePassword(fd), 'Contraseña cambiada exitosamente.');
                  changePassRef.current?.reset();
                }} className="space-y-4">
                  <div>
                    <label htmlFor="adm-curr-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contraseña Actual</label>
                    <input id="adm-curr-pass" name="currentPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label htmlFor="adm-new-pass" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nueva Contraseña</label>
                    <input id="adm-new-pass" name="newPassword" type="password" required placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <button type="submit" disabled={isPending} className="w-full bg-primary text-white p-2.5 rounded-lg text-sm font-bold shadow hover:bg-secondary transition-all cursor-pointer disabled:opacity-60">
                    {isPending ? 'Guardando...' : 'Actualizar Contraseña'}
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
