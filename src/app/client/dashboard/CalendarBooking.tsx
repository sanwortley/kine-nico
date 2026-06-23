'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { reserveMultipleTurnos } from '@/modules/turnos/actions';

interface Turno {
  id: string;
  fechaInicio: Date | string;
  duracion: number;
  service?: { name: string };
  professional?: { name: string };
}

interface Props {
  availableTurnos: Turno[];
  myTurnosDates: (Date | string)[];
  turnosRestantes: number;
  planNombre: string | null;
  clientId: string;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CalendarBooking({ availableTurnos, myTurnosDates, turnosRestantes, planNombre, clientId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  const todayKey = toDateKey(today);

  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const turnosByDate = useMemo(() => {
    const map: Record<string, Turno[]> = {};
    for (const t of availableTurnos) {
      const key = toDateKey(new Date(t.fechaInicio));
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    for (const key in map) {
      map[key].sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    }
    return map;
  }, [availableTurnos]);

  const myBookedDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of myTurnosDates) set.add(toDateKey(new Date(d)));
    return set;
  }, [myTurnosDates]);

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

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < turnosRestantes) {
        next.add(id);
      }
      return next;
    });
  }

  function handleBook() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setError('');
    startTransition(async () => {
      const res = await reserveMultipleTurnos(ids, clientId, notes || undefined);
      if (res.success) {
        router.push(
          `/client/dashboard?tab=turnos&successMsg=${encodeURIComponent(
            `¡${ids.length} turno${ids.length > 1 ? 's' : ''} reservado${ids.length > 1 ? 's' : ''} exitosamente! Recibirás una confirmación por correo.`
          )}`
        );
      } else {
        setError(res.error || 'No se pudieron reservar los turnos.');
        router.refresh();
      }
    });
  }

  const remaining = turnosRestantes - selectedIds.size;
  const atLimit = selectedIds.size >= turnosRestantes;

  return (
    <div className="space-y-4">
      {/* Banner de sesiones */}
      <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${selectedIds.size > 0 ? 'bg-accent/8 border-accent/20' : 'bg-primary/5 border-primary/15'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-base transition-colors ${selectedIds.size > 0 ? 'bg-accent text-white' : 'bg-primary/15 text-primary'}`}>
            {selectedIds.size > 0 ? selectedIds.size : turnosRestantes}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {selectedIds.size > 0
                ? `${selectedIds.size} turno${selectedIds.size > 1 ? 's' : ''} seleccionado${selectedIds.size > 1 ? 's' : ''}`
                : `${turnosRestantes} ${turnosRestantes !== 1 ? 'sesiones' : 'sesión'} disponible${turnosRestantes !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500">
              {selectedIds.size > 0 ? `Quedarán ${remaining} ${remaining !== 1 ? 'sesiones' : 'sesión'} en tu plan` : (planNombre ?? 'Plan activo')}
            </p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Calendario */}
      <div className="rounded-2xl border border-slate-150 overflow-hidden bg-white">
        {/* Navegación de mes */}
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

        {/* Nombres de días */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayKey, i) => {
            if (!dayKey) {
              return <div key={`pad-${i}`} className="h-[52px] border-b border-r border-slate-50" />;
            }

            const hasAvailable = !!turnosByDate[dayKey];
            const hasMyBooking = myBookedDateKeys.has(dayKey);
            const isPast = dayKey < todayKey;
            const isToday = dayKey === todayKey;
            const isSelected = selectedDay === dayKey;
            const selectedCountThisDay = (turnosByDate[dayKey] || []).filter(t => selectedIds.has(t.id)).length;
            const dayNum = Number(dayKey.split('-')[2]);

            return (
              <button
                key={dayKey}
                onClick={() => {
                  if (!isPast && hasAvailable) setSelectedDay(isSelected ? null : dayKey);
                }}
                disabled={isPast || !hasAvailable}
                className={`
                  h-[52px] border-b border-r border-slate-100 flex flex-col items-center justify-center gap-0.5 transition-all
                  ${isPast || !hasAvailable ? 'cursor-default' : 'hover:bg-accent/5 cursor-pointer'}
                  ${isSelected ? 'bg-accent/8' : ''}
                `}
              >
                <span className={`
                  text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors
                  ${isToday ? 'bg-primary text-white' : ''}
                  ${isSelected && !isToday ? 'text-accent' : ''}
                  ${!isToday && !isSelected ? (isPast ? 'text-slate-300' : 'text-slate-700') : ''}
                `}>
                  {dayNum}
                </span>
                <div className="flex gap-0.5 h-2 items-center">
                  {hasAvailable && (
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCountThisDay > 0 ? 'bg-accent' : 'bg-green-500'}`} />
                  )}
                  {hasMyBooking && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 px-0.5">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Turnos disponibles</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Mi reserva</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Seleccionado</span>
      </div>

      {/* Horarios del día seleccionado */}
      {selectedDay && turnosByDate[selectedDay] && (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-150 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {turnosByDate[selectedDay].map(t => {
              const isChecked = selectedIds.has(t.id);
              const isDisabled = !isChecked && atLimit;
              const time = new Date(t.fechaInicio).toLocaleTimeString('es-AR', {
                hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Argentina/Cordoba',
                hour12: false,
              });

              return (
                <label
                  key={t.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border transition-all select-none
                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    ${isChecked ? 'bg-accent/10 border-accent/30' : 'bg-white border-slate-200 hover:border-slate-300'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => !isDisabled && toggleId(t.id)}
                    className="w-4 h-4 rounded accent-accent shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-slate-800'}`}>{time} hs</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.professional?.name} · {t.duracion} min</p>
                  </div>
                  {isChecked && (
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
          {atLimit && (
            <p className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Usaste todas tus sesiones disponibles. Desseleccioná alguna para cambiar.
            </p>
          )}
        </div>
      )}

      {/* CTA de confirmación */}
      {selectedIds.size > 0 && (
        <div className="bg-white rounded-2xl border border-accent/20 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">
              {selectedIds.size} turno{selectedIds.size > 1 ? 's' : ''} a confirmar
            </p>
            <span className="text-xs text-slate-500">
              Quedarán {remaining} {remaining !== 1 ? 'sesiones' : 'sesión'} disponibles
            </span>
          </div>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas / Motivo de consulta (opcional)..."
            className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-accent focus:border-transparent transition-all"
          />
          <button
            onClick={handleBook}
            disabled={isPending}
            className="w-full bg-accent hover:bg-accent-light disabled:opacity-60 text-white py-3 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {isPending
              ? 'Reservando...'
              : `Confirmar ${selectedIds.size} turno${selectedIds.size > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}