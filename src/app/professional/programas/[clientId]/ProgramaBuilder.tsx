'use client';

import Image from 'next/image';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { EjercicioPayload } from '@/modules/programas/actions';
import { cerrarYNuevoBloque } from '@/modules/programas/actions';

// ── types ────────────────────────────────────────────────────────────────────
type Serie    = { reps: string; pctRM: string; kg: string };
type EjSesion = EjercicioPayload & { tempId: string };
type DayMap   = Record<string, EjSesion[]>;

interface Ejercicio { id: string; nombre: string; patron: string; videoUrl?: string | null }

interface Props {
  clientId:       string;
  clientName:     string;
  bloqueActual:   string;
  ejercicios:     Ejercicio[];
  initialData:    Record<string, Omit<EjercicioPayload, never>[]>;
  saveAction:     (clientId: string, semana: number, dia: number, ejs: EjercicioPayload[]) => Promise<{ success: boolean }>;
}

// ── constants ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  'Movilidad','Activación','Fuerza','Circuito',
  'Bloque 1','Bloque 2','Bloque 3','Bloque 4','Bloque 5',
  'Recovery','Set Piramidal','Complex','AMRAP','EMOM',
  'Superset','Potencia','Hipertrofia','Drop Set','Accesorio',
];
const CAT_COLOR: Record<string, string> = {
  Movilidad:'#2980B9', Activación:'#94a3b8', Fuerza:'#e74c3c',
  Circuito:'#e67e22', Recovery:'#27AE60', AMRAP:'#e67e22',
  EMOM:'#f39c12', Superset:'#8b5cf6', Potencia:'#06b6d4',
  Hipertrofia:'#6366f1','Drop Set':'#ec4899', Accesorio:'#8b5cf6',
  'Bloque 1':'#2980B9','Bloque 2':'#e67e22','Bloque 3':'#8b5cf6',
  'Bloque 4':'#27AE60','Bloque 5':'#f39c12','Set Piramidal':'#e74c3c', Complex:'#2980B9',
};
const cc = (c: string) => CAT_COLOR[c] ?? '#94a3b8';

function uid()  { return Math.random().toString(36).slice(2); }
function dayKey(s: number, d: number) { return `${s}-${d}`; }
function epley(kg: string, reps: string) {
  const k = parseFloat(kg); const r = parseInt(reps);
  if (!k || !r || r === 1) return k ? String(k) : '';
  return String(Math.round(k * (1 + r / 30) * 10) / 10);
}
const blankSerie = (): Serie => ({ reps: '', pctRM: '', kg: '' });

// ── helpers ──────────────────────────────────────────────────────────────────
function ParamField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-primary" />
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function ProgramaBuilder({ clientId, clientName, bloqueActual, ejercicios, initialData, saveAction }: Props) {
  const normalise = (): DayMap => {
    const m: DayMap = {};
    for (const [k, list] of Object.entries(initialData)) {
      m[k] = (list as any[]).map(e => ({ ...e, tempId: uid() }));
    }
    return m;
  };

  const [data,         setData]        = useState<DayMap>(normalise);
  const [semana,       setSemana]       = useState(1);
  // Total semanas: derived from saved data (at least 1)
  const savedSemanas = Math.max(1, ...Object.keys(data).map(k => parseInt(k.split('-')[0])));
  const [extraSemanas, setExtraSemanas] = useState(0);
  const totalSemanas = Math.max(savedSemanas, 1 + extraSemanas);
  const [dia,          setDia]          = useState(1);
  const [selIdx,       setSelIdx]       = useState(0);
  const [search,       setSearch]       = useState('');
  const [filterPatron, setFilterPatron] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [savedMsg,     setSavedMsg]     = useState('');
  const [mobilePanel,  setMobilePanel]  = useState<'biblioteca' | 'sesion' | 'detalle'>('sesion');
  const [cerrarModal,  setCerrarModal]  = useState(false);
  const [nombreNuevo,  setNombreNuevo]  = useState('');
  const [cerrando,     setCerrando]     = useState(false);

  // Auto-save: track dirty keys and flush after 1.5 s of inactivity
  const dataRef  = useRef(data);
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { dataRef.current = data; }, [data]);

  const flushSave = useCallback(async () => {
    const keys = [...dirtyRef.current];
    if (!keys.length) return;
    dirtyRef.current.clear();
    setSaving(true);
    setSavedMsg('');
    for (const k of keys) {
      const [s, d] = k.split('-').map(Number);
      const ses = dataRef.current[k] ?? [];
      const payload: EjercicioPayload[] = ses.map(e => ({
        ejercicioId: e.ejercicioId, nombre: e.nombre, patron: e.patron,
        categoria: e.categoria, rir: e.rir, descanso: e.descanso, tempo: e.tempo,
        microPausa: e.microPausa, rounds: e.rounds, timeCap: e.timeCap,
        series: e.series.map((s2, idx) => ({ numero: idx + 1, reps: s2.reps, pctRM: s2.pctRM, kg: s2.kg })),
      }));
      await saveAction(clientId, s, d, payload);
    }
    setSaving(false);
    setSavedMsg('✓ Guardado');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [clientId, saveAction]);

  const scheduleAutoSave = useCallback((dirtyKey: string) => {
    dirtyRef.current.add(dirtyKey);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSave, 1500);
  }, [flushSave]);

  const key      = dayKey(semana, dia);
  const session: EjSesion[] = data[key] ?? [];
  const selected = session[selIdx] ?? null;

  // Pre-populate from Semana 1 when switching to an empty semana, then auto-save
  const changeSemana = useCallback((s: number) => {
    setSemana(s);
    setSelIdx(0);
    if (s > 1) {
      const populated: string[] = [];
      setData(prev => {
        const allDias = [...new Set(Object.keys(prev).map(k => parseInt(k.split('-')[1])))];
        const next = { ...prev };
        for (const d of allDias) {
          const targetKey = dayKey(s, d);
          if (!prev[targetKey] || prev[targetKey].length === 0) {
            const base = prev[dayKey(1, d)];
            if (base && base.length > 0) {
              next[targetKey] = base.map(e => ({ ...e, tempId: uid() }));
              populated.push(targetKey);
            }
          }
        }
        return next;
      });
      populated.forEach(k => scheduleAutoSave(k));
    }
  }, [scheduleAutoSave]);

  const setSession = useCallback((fn: (prev: EjSesion[]) => EjSesion[]) => {
    setData(d => ({ ...d, [key]: fn(d[key] ?? []) }));
    scheduleAutoSave(key);
  }, [key, scheduleAutoSave]);

  // ── library ──────────────────────────────────────────────────────────────
  const patrones  = [...new Set(ejercicios.map(e => e.patron))].sort();
  const libFilter = ejercicios.filter(e => {
    const matchS = !search || e.nombre.toLowerCase().includes(search.toLowerCase());
    const matchP = !filterPatron || e.patron === filterPatron;
    return matchS && matchP;
  });
  const inSession = new Set(session.map(e => e.ejercicioId));

  function toggleEjercicio(ej: Ejercicio) {
    if (inSession.has(ej.id)) {
      const idx = session.findIndex(e => e.ejercicioId === ej.id);
      setSession(prev => prev.filter(e => e.ejercicioId !== ej.id));
      setSelIdx(i => (idx <= i ? Math.max(0, i - 1) : i));
    } else {
      const nuevo: EjSesion = {
        tempId: uid(), ejercicioId: ej.id, nombre: ej.nombre, patron: ej.patron,
        categoria: '', rir: '', descanso: '90s', tempo: '', microPausa: '', rounds: '', timeCap: '',
        series: [blankSerie(), blankSerie(), blankSerie()],
      };
      setSession(prev => [...prev, nuevo]);
      setSelIdx(session.length);
    }
  }

  const allFilteredInSession = libFilter.length > 0 && libFilter.every(ej => inSession.has(ej.id));

  function toggleAllFiltered() {
    if (allFilteredInSession) {
      const ids = new Set(libFilter.map(ej => ej.id));
      setSession(prev => prev.filter(e => !ids.has(e.ejercicioId)));
      setSelIdx(0);
    } else {
      const toAdd = libFilter.filter(ej => !inSession.has(ej.id));
      const nuevos: EjSesion[] = toAdd.map(ej => ({
        tempId: uid(), ejercicioId: ej.id, nombre: ej.nombre, patron: ej.patron,
        categoria: '', rir: '', descanso: '90s', tempo: '', microPausa: '', rounds: '', timeCap: '',
        series: [blankSerie(), blankSerie(), blankSerie()],
      }));
      setSession(prev => [...prev, ...nuevos]);
      setSelIdx(session.length);
    }
  }

  function updateSerie(i: number, field: keyof Serie, val: string) {
    if (!selected) return;
    setSession(prev => prev.map(e => e.tempId !== selected.tempId ? e : {
      ...e, series: e.series.map((s, idx) => idx === i ? { ...s, [field]: val } : s),
    }));
  }

  function setSeries(count: number) {
    if (!selected || count < 1) return;
    setSession(prev => prev.map(e => {
      if (e.tempId !== selected.tempId) return e;
      const cur = e.series;
      if (count > cur.length) return { ...e, series: [...cur, ...Array(count - cur.length).fill(null).map(blankSerie)] };
      return { ...e, series: cur.slice(0, count) };
    }));
  }

  function updateParam(field: string, val: string) {
    if (!selected) return;
    setSession(prev => prev.map(e => e.tempId !== selected.tempId ? e : { ...e, [field]: val }));
  }

  function deleteEj() {
    if (!selected) return;
    setSession(prev => prev.filter(e => e.tempId !== selected.tempId));
    setSelIdx(i => Math.max(0, i - 1));
  }

  function duplicateEj() {
    if (!selected) return;
    const dup: EjSesion = { ...selected, tempId: uid() };
    setSession(prev => {
      const idx = prev.findIndex(e => e.tempId === selected.tempId);
      const next = [...prev]; next.splice(idx + 1, 0, dup); return next;
    });
    setSelIdx(selIdx + 1);
  }

  function copyConfig() {
    if (!selected || session.length < 2) return;
    setSession(prev => prev.map(e => e.tempId === selected.tempId ? e : {
      ...e,
      rir: selected.rir, descanso: selected.descanso, tempo: selected.tempo,
      microPausa: selected.microPausa, rounds: selected.rounds, timeCap: selected.timeCap,
      series: selected.series.map(s => ({ ...s })),
    }));
  }

  async function handleCerrar() {
    setCerrando(true);
    await cerrarYNuevoBloque(clientId, nombreNuevo);
    window.location.reload();
  }

  async function handleSave() {
    setSaving(true);
    const payload: EjercicioPayload[] = session.map(e => ({
      ejercicioId: e.ejercicioId, nombre: e.nombre, patron: e.patron,
      categoria: e.categoria, rir: e.rir, descanso: e.descanso, tempo: e.tempo,
      microPausa: e.microPausa, rounds: e.rounds, timeCap: e.timeCap,
      series: e.series.map((s, idx) => ({ numero: idx + 1, reps: s.reps, pctRM: s.pctRM, kg: s.kg })),
    }));
    const res = await saveAction(clientId, semana, dia, payload);
    setSaving(false);
    if (res.success) { setSavedMsg('✓ Guardado'); setTimeout(() => setSavedMsg(''), 2000); }
  }

  // stats
  const totalSeries = session.reduce((a, e) => a + e.series.length, 0);
  const totalReps   = session.reduce((a, e) => a + e.series.reduce((b, s) => b + (parseInt(s.reps) || 0), 0), 0);
  const sinReps     = session.reduce((a, e) => a + e.series.filter(s => !s.reps).length, 0);
  const estMin      = Math.round(totalSeries * 2.5);
  const filledSeries = selected ? selected.series.filter(s => s.reps).length : 0;
  const progress     = selected ? filledSeries / Math.max(selected.series.length, 1) : 0;
  const isComplete   = selected ? progress === 1 : false;

  return (
    <div className="bg-slate-50 h-screen flex flex-col overflow-hidden font-sans">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shrink-0 shadow-sm">
        {/* Fila 1 móvil: ← nombre/bloque [spacer] cerrar guardar */}
        <div className="flex items-center gap-2 px-3 h-11 sm:hidden">
          <a href="/professional/programas" title="Volver"
            className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{clientName}</p>
            <p className="text-[10px] text-primary font-semibold truncate">{bloqueActual}</p>
          </div>
          <button onClick={() => setCerrarModal(true)} title="Cerrar bloque"
            className="h-8 px-2 rounded-lg border border-amber-200 bg-amber-50 flex items-center gap-1 text-amber-700 text-[10px] font-bold shrink-0">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Cerrar bloque
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-light transition-colors disabled:opacity-50 shrink-0">
            {saving ? '…' : savedMsg ? '✓' : 'Guardar'}
          </button>
        </div>

        {/* Fila 2 móvil: semana + día */}
        <div className="flex items-center gap-2 px-3 h-10 border-t border-slate-100 sm:hidden">
          <div className="flex items-center gap-1 flex-1">
            <select value={semana} onChange={e => changeSemana(+e.target.value)}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:border-primary flex-1">
              {Array.from({ length: totalSemanas }, (_, i) => i + 1).map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
            {totalSemanas < 8 && (
              <button onClick={() => { setExtraSemanas(e => e + 1); changeSemana(totalSemanas + 1); }}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-lg font-bold flex items-center justify-center shrink-0">+</button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setDia(d => Math.max(1, d - 1)); setSelIdx(0); }}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-bold cursor-pointer">‹</button>
            <span className="bg-primary text-white font-bold text-sm px-3 h-8 rounded-lg flex items-center whitespace-nowrap">
              Día {dia}
            </span>
            <button onClick={() => { setDia(d => Math.min(7, d + 1)); setSelIdx(0); }}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-bold cursor-pointer">›</button>
          </div>
        </div>

        {/* Desktop: fila única original */}
        <div className="hidden sm:flex items-center gap-3 px-4 h-14">
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" unoptimized />
            <div className="flex flex-col leading-none">
              <span className="font-title font-bold text-primary text-sm">Nicolas Jaled Kine</span>
              <span className="text-[10px] text-slate-400 font-subtitle">Programas de entrenamiento</span>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semana</span>
            <select value={semana} onChange={e => changeSemana(+e.target.value)}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:border-primary">
              {Array.from({ length: totalSemanas }, (_, i) => i + 1).map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
            {totalSemanas < 8 && (
              <button onClick={() => { setExtraSemanas(e => e + 1); changeSemana(totalSemanas + 1); }}
                title="Agregar semana"
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-lg font-bold flex items-center justify-center">+</button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Día</span>
            <button onClick={() => { setDia(d => Math.max(1, d - 1)); setSelIdx(0); }}
              className="w-7 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold cursor-pointer">‹</button>
            <span className="bg-primary text-white font-bold text-sm px-3 h-8 rounded-lg flex items-center whitespace-nowrap">Día {dia}</span>
            <button onClick={() => { setDia(d => Math.min(7, d + 1)); setSelIdx(0); }}
              className="w-7 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold cursor-pointer">›</button>
          </div>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-slate-600 truncate max-w-[140px]">{clientName}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-bold text-primary">{bloqueActual}</span>
          <button onClick={() => setCerrarModal(true)}
            className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Cerrar bloque
          </button>
          <a href="/professional/programas"
            className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Pacientes
          </a>
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap">
            {saving ? 'Guardando…' : savedMsg || 'Guardar'}
          </button>
        </div>
      </header>

      {/* ── 3 COLUMNS ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── BIBLIOTECA ─────────────────────────────────────────────────── */}
        <div className={`${mobilePanel === 'biblioteca' ? 'flex' : 'hidden'} md:flex w-full md:w-48 shrink-0 border-r border-slate-200 flex-col bg-white`}>
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Biblioteca</p>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ejercicio..."
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary mb-1.5 bg-slate-50" />
            <select value={filterPatron} onChange={e => setFilterPatron(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-primary bg-slate-50">
              <option value="">— Todos los patrones —</option>
              {patrones.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {libFilter.length > 0 && (
              <button onClick={toggleAllFiltered}
                className={`mt-1.5 w-full h-7 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${allFilteredInSession ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'}`}>
                {allFilteredInSession ? `Quitar todos (${libFilter.length})` : `Agregar todos (${libFilter.length})`}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {libFilter.map(ej => {
              const active = inSession.has(ej.id);
              return (
                <div key={ej.id} onClick={() => toggleEjercicio(ej)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors ${active ? 'bg-accent/5 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${active ? 'bg-accent border-accent' : 'border-slate-300'}`}>
                    {active && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                  </div>
                  <span className="truncate font-medium flex-1">{ej.nombre}</span>
                  {ej.videoUrl && <svg className="w-3 h-3 shrink-0 text-red-400 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SESIÓN ─────────────────────────────────────────────────────── */}
        <div className={`${mobilePanel === 'sesion' ? 'flex' : 'hidden'} md:flex w-full md:w-56 shrink-0 border-r border-slate-200 flex-col bg-slate-50`}>
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesión</p>
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{session.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
            {session.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8 px-3 leading-relaxed">
                Hacé click en un ejercicio de la biblioteca para agregarlo
              </p>
            )}
            {session.map((e, idx) => {
              const isActive = idx === selIdx;
              const filled   = e.series.filter(s => s.reps).length;
              return (
                <div key={e.tempId} onClick={() => { setSelIdx(idx); setMobilePanel('detalle'); }}
                  className={`rounded-xl px-3 py-2.5 cursor-pointer transition-all border ${isActive ? 'bg-white border-primary/30 shadow-sm' : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-bold shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-slate-400'}`}>{idx + 1}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-primary' : 'text-slate-700'}`}>{e.nombre}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {e.series.length} series · RIR {e.rir || '—'}
                        {filled > 0 && <span className="text-accent ml-1.5">✓ {filled}/{e.series.length}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DETALLE ────────────────────────────────────────────────────── */}
        <div className={`${mobilePanel === 'detalle' ? 'flex flex-col' : 'hidden'} md:flex md:flex-col flex-1 overflow-y-auto bg-slate-50`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-8 text-center">
              Seleccioná un ejercicio de la sesión para configurarlo
            </div>
          ) : (
            <div className="p-5 space-y-4 max-w-3xl">

              {/* Header ejercicio */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-xl font-title font-bold text-slate-800 truncate">{selected.nombre}</h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                      {selected.patron || 'Sin patrón'}
                    </span>
                    {(() => { const ej = ejercicios.find(e => e.id === selected.ejercicioId); return ej?.videoUrl ? (
                      <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 hover:bg-red-100 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Ver video
                      </a>
                    ) : null; })()}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isComplete ? 'bg-accent/10 text-accent' : 'bg-amber-50 text-amber-600'}`}>
                      {isComplete ? '✓ Completo' : `Incompleto ${Math.round(progress * 100)}%`}
                    </span>
                    <span className="text-xs text-slate-400">{selIdx + 1} / {session.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setSelIdx(i => Math.max(0, i - 1))} disabled={selIdx === 0}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer text-sm font-bold">‹</button>
                  <button onClick={() => setSelIdx(i => Math.min(session.length - 1, i + 1))} disabled={selIdx >= session.length - 1}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer text-sm font-bold">›</button>
                </div>
              </div>

              {/* SERIES */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Series</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Cantidad</span>
                    <button onClick={() => setSeries(selected.series.length - 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-base transition-colors cursor-pointer flex items-center justify-center">−</button>
                    <span className="font-title font-bold text-primary text-xl w-5 text-center">{selected.series.length}</span>
                    <button onClick={() => setSeries(selected.series.length + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-base transition-colors cursor-pointer flex items-center justify-center">+</button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="w-8 pb-2 text-left" />
                        <th className="pb-2 px-2 text-xs font-bold text-red-500 uppercase tracking-wider text-center">Reps</th>
                        <th className="pb-2 px-2 text-xs font-bold text-amber-500 uppercase tracking-wider text-center">%1RM</th>
                        <th className="pb-2 px-2 text-xs font-bold text-orange-500 uppercase tracking-wider text-center">KG</th>
                        <th className="pb-2 px-2 text-xs font-bold text-secondary uppercase tracking-wider text-center">1RM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.series.map((s, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 text-xs font-bold text-slate-400">S{i + 1}</td>
                          <td className="py-2 px-1.5">
                            <input value={s.reps} onChange={e => updateSerie(i, 'reps', e.target.value)}
                              type="number" min="0" placeholder="0"
                              className={`w-full h-9 text-center rounded-lg border text-sm font-bold focus:outline-none transition-colors ${s.reps ? 'border-accent/40 bg-accent/5 text-accent focus:border-accent' : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-primary'}`} />
                          </td>
                          <td className="py-2 px-1.5">
                            <input value={s.pctRM} onChange={e => updateSerie(i, 'pctRM', e.target.value)}
                              type="number" min="0" max="100" placeholder="0"
                              className="w-full h-9 text-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:border-amber-400" />
                          </td>
                          <td className="py-2 px-1.5">
                            <input value={s.kg} onChange={e => updateSerie(i, 'kg', e.target.value)}
                              type="number" min="0" step="0.5" placeholder="0"
                              className="w-full h-9 text-center rounded-lg border border-orange-200 bg-orange-50/30 text-sm font-bold text-slate-700 focus:outline-none focus:border-orange-400" />
                          </td>
                          <td className="py-2 px-1.5">
                            <div className="h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-secondary">
                              {epley(s.kg, s.reps) || '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PARÁMETROS */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Parámetros</p>
                <div className="grid grid-cols-3 gap-3">
                  <ParamField label="RIR"         value={selected.rir}        onChange={v => updateParam('rir', v)}        placeholder="0" />
                  <ParamField label="Descanso"    value={selected.descanso}   onChange={v => updateParam('descanso', v)}   placeholder="90s" />
                  <ParamField label="Tempo"       value={selected.tempo}      onChange={v => updateParam('tempo', v)}      placeholder="3-1-1" />
                  <ParamField label="Micro Pausa" value={selected.microPausa} onChange={v => updateParam('microPausa', v)} placeholder="10s" />
                  <ParamField label="Rounds"      value={selected.rounds}     onChange={v => updateParam('rounds', v)}     placeholder="AMRAP/5" />
                  <ParamField label="Time Cap"    value={selected.timeCap}    onChange={v => updateParam('timeCap', v)}    placeholder="15min" />
                </div>
              </div>

              {/* CATEGORÍA */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Categoría</p>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ background: cc(selected.categoria) }} />
                  <select value={selected.categoria} onChange={e => updateParam('categoria', e.target.value)}
                    className="w-full h-9 pl-8 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-primary appearance-none">
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex gap-2 flex-wrap pb-4">
                <button onClick={copyConfig}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  Copiar config a todos
                </button>
                <button onClick={duplicateEj}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  Duplicar
                </button>
                <button onClick={deleteEj}
                  className="h-9 px-4 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL CERRAR BLOQUE ──────────────────────────────────────────── */}
      {cerrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="font-title text-lg font-bold text-slate-800">Cerrar bloque</h3>
              <p className="text-xs text-slate-500 mt-1">
                El bloque actual <strong>"{bloqueActual}"</strong> quedará guardado en el historial. Se creará uno nuevo en blanco.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del nuevo bloque</label>
              <input
                value={nombreNuevo}
                onChange={e => setNombreNuevo(e.target.value)}
                placeholder="Ej: Bloque 2 - Carga"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setCerrarModal(false)} disabled={cerrando}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCerrar} disabled={cerrando}
                className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {cerrando ? 'Cerrando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE PANEL TABS ────────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-t border-slate-200 flex shrink-0 h-12">
        {(['biblioteca', 'sesion', 'detalle'] as const).map(p => (
          <button key={p} onClick={() => setMobilePanel(p)}
            className={`flex-1 h-full text-[11px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${mobilePanel === p ? 'text-primary border-t-2 border-primary -mt-px' : 'text-slate-400'}`}>
            {p === 'biblioteca' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            )}
            {p === 'sesion' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
            {p === 'detalle' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
            <span className="capitalize">{p === 'biblioteca' ? 'Biblioteca' : p === 'sesion' ? 'Sesión' : 'Detalle'}</span>
          </button>
        ))}
      </div>

      {/* ── STATUS BAR ───────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-slate-200 px-5 h-9 flex items-center gap-6 text-xs text-slate-500 shrink-0">
        <span><strong className="text-slate-800 font-bold">{session.length}</strong> ejercicios</span>
        <span><strong className="text-slate-800 font-bold">{totalSeries}</strong> series</span>
        <span><strong className="text-slate-800 font-bold">{totalReps}</strong> reps</span>
        <span><strong className="text-slate-800 font-bold">{estMin}'</strong> est.</span>
        {sinReps > 0 && (
          <span className="ml-auto text-red-500 font-bold">⚠ {sinReps} sin reps</span>
        )}
      </div>
    </div>
  );
}