'use client';

import { useState, useMemo } from 'react';

interface Turno {
  id: string;
  fechaInicio: string;
  duracion: number;
  estado: string;
  notas: string | null;
  service: { name: string };
  professional: { name: string };
  client: { name: string; email: string } | null;
}

type Filter = 'TODOS' | 'DISPONIBLE' | 'RESERVADO' | 'COMPLETADO';

interface Props {
  turnos: Turno[];
  completeAction: (formData: FormData) => Promise<void>;
  cancelAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
    hour12: false,
  });
}

const STATE: Record<string, { dot: string; card: string; badge: string; label: string }> = {
  DISPONIBLE: { dot: 'bg-green-500',  card: 'border-green-200 bg-green-50/30',  badge: 'bg-green-100 text-green-700',  label: 'Disponible' },
  RESERVADO:  { dot: 'bg-blue-500',   card: 'border-blue-200 bg-blue-50/30',    badge: 'bg-blue-100 text-blue-700',    label: 'Reservado'  },
  COMPLETADO: { dot: 'bg-slate-400',  card: 'border-slate-200 bg-slate-50/30',  badge: 'bg-slate-100 text-slate-600',  label: 'Completado' },
  CANCELADO:  { dot: 'bg-red-400',    card: 'border-red-200 bg-red-50/20',      badge: 'bg-red-100 text-red-600',      label: 'Cancelado'  },
};

export default function AdminCalendar({ turnos, completeAction, cancelAction, deleteAction }: Props) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey);
  const [filter, setFilter] = useState<Filter>('TODOS');

  const turnosByDate = useMemo(() => {
    const map: Record<string, Turno[]> = {};
    for (const t of turnos) {
      const key = toDateKey(new Date(t.fechaInicio));
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    for (const k in map) {
      map[k].sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    }
    return map;
  }, [turnos]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [currentMonth]);

  const selectedTurnos = useMemo(() => {
    if (!selectedDay) return [];
    const all = turnosByDate[selectedDay] || [];
    return filter === 'TODOS' ? all : all.filter(t => t.estado === filter);
  }, [selectedDay, turnosByDate, filter]);

  const filterOptions: { key: Filter; label: string; active: string; inactive: string }[] = [
    { key: 'TODOS',      label: 'Todos',       active: 'bg-primary text-white',   inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' },
    { key: 'DISPONIBLE', label: 'Disponibles', active: 'bg-green-500 text-white',  inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' },
    { key: 'RESERVADO',  label: 'Reservados',  active: 'bg-blue-500 text-white',   inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' },
    { key: 'COMPLETADO', label: 'Completados', active: 'bg-slate-500 text-white',  inactive: 'bg-slate-100 text-slate-500 hover:bg-slate-200' },
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filter === opt.key ? opt.active : opt.inactive}`}
          >
            {opt.label}
            {opt.key !== 'TODOS' && (
              <span className="ml-1.5 opacity-75">
                ({turnos.filter(t => t.estado === opt.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        {/* Calendario */}
        <div className="rounded-2xl border border-slate-150 overflow-hidden bg-white">
          {/* Nav mes */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-150">
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold text-slate-800 text-sm">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Nombres días */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {calendarDays.map((dayKey, i) => {
              if (!dayKey) return <div key={`pad-${i}`} className="h-[60px] border-b border-r border-slate-50" />;

              const dayTurnos = turnosByDate[dayKey] || [];
              const visible = filter === 'TODOS' ? dayTurnos : dayTurnos.filter(t => t.estado === filter);
              const hasDisp = dayTurnos.some(t => t.estado === 'DISPONIBLE');
              const hasResv = dayTurnos.some(t => t.estado === 'RESERVADO');
              const hasComp = dayTurnos.some(t => t.estado === 'COMPLETADO');
              const isToday = dayKey === todayKey;
              const isSelected = selectedDay === dayKey;
              const dayNum = Number(dayKey.split('-')[2]);

              return (
                <button
                  key={dayKey}
                  onClick={() => setSelectedDay(isSelected ? null : dayKey)}
                  disabled={visible.length === 0}
                  className={`
                    h-[60px] border-b border-r border-slate-100 flex flex-col items-center justify-center gap-1 transition-all
                    ${visible.length === 0 ? 'cursor-default' : 'hover:bg-primary/5 cursor-pointer'}
                    ${isSelected ? 'bg-primary/8' : ''}
                  `}
                >
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors
                    ${isToday ? 'bg-primary text-white' : isSelected ? 'text-primary' : 'text-slate-700'}`}>
                    {dayNum}
                  </span>
                  {dayTurnos.length > 0 && (
                    <div className="flex gap-0.5 items-center">
                      {hasDisp && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasResv && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {hasComp && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="space-y-2">
          {selectedDay ? (
            <>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="ml-2 font-normal normal-case text-slate-400">({selectedTurnos.length} turno{selectedTurnos.length !== 1 ? 's' : ''})</span>
              </p>

              {selectedTurnos.length === 0 ? (
                <div className="rounded-2xl border border-slate-150 bg-white p-6 text-center">
                  <p className="text-sm text-slate-400">Sin turnos con este filtro.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
                  {selectedTurnos.map(t => {
                    const s = STATE[t.estado] ?? STATE.DISPONIBLE;
                    return (
                      <div key={t.id} className={`rounded-2xl border p-3.5 ${s.card}`}>
                        {/* Cabecera */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${s.dot}`} />
                            <div>
                              <p className="text-sm font-bold text-slate-800">{formatTime(t.fechaInicio)} hs</p>
                              <p className="text-[11px] text-slate-500">{t.service.name} · {t.duracion} min</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>{s.label}</span>
                        </div>

                        {/* Profesional */}
                        <p className="text-[11px] text-accent font-semibold pl-4 mb-1">{t.professional.name}</p>

                        {/* Paciente */}
                        {t.client && (
                          <div className="ml-4 pl-3 border-l-2 border-blue-200 mb-2">
                            <p className="text-xs font-semibold text-slate-700">👤 {t.client.name}</p>
                            <p className="text-[10px] text-slate-400">{t.client.email}</p>
                            {t.notas && <p className="text-[10px] italic text-slate-500 mt-0.5">"{t.notas}"</p>}
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-2 items-center justify-end pt-2 border-t border-slate-150/60 mt-1">
                          {t.estado === 'RESERVADO' && (
                            <form action={completeAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <button type="submit" className="text-xs bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-lg font-bold hover:bg-green-100 transition-all cursor-pointer">
                                Completar
                              </button>
                            </form>
                          )}
                          {t.estado !== 'CANCELADO' && t.estado !== 'COMPLETADO' && (
                            <form action={cancelAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <button type="submit" className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg font-bold hover:bg-red-100 transition-all cursor-pointer">
                                Cancelar
                              </button>
                            </form>
                          )}
                          <form action={deleteAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              onClick={e => { if (!confirm('¿Eliminar este turno de la agenda?')) e.preventDefault(); }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-150 bg-white p-8 text-center">
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-400">Seleccioná un día para ver los turnos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Reservado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />Completado</span>
      </div>
    </div>
  );
}