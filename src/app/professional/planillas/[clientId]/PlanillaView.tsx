'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import type { PlanillaData } from '@/modules/planillas/actions';

// ── types ────────────────────────────────────────────────────────────────────
type Dinam = {
  id: string; fecha: Date;
  cuadDer: number | null; cuadIzq: number | null;
  isquioDer: number | null; isquioIzq: number | null;
  abdDer: number | null; abdIzq: number | null;
  eversorDer: number | null; eversorIzq: number | null;
  romCaderaDer: number | null; romCaderaIzq: number | null;
  romTobilloDer: number | null; romTobilloIzq: number | null;
  velocidadSquat: number | null;
  peso: number | null;
};

// Prisma returns null for optional fields; PlanillaData uses undefined — bridge with any
type DbPlanilla = { [K in keyof PlanillaData]?: PlanillaData[K] | null } & { id?: string; createdAt?: Date; updatedAt?: Date; };

interface Props {
  clientId:    string;
  clientName:  string;
  planilla:    DbPlanilla | null;
  dinamometrias: Dinam[];
  saveAction:  (clientId: string, data: PlanillaData) => Promise<unknown>;
}

type Tab = 'dashboard' | 'entrevista';
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIA_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

// ── helpers ──────────────────────────────────────────────────────────────────
function lsi(a: number | null, b: number | null) {
  if (!a || !b) return null;
  return Math.round((Math.min(a, b) / Math.max(a, b)) * 100);
}

function lsiColor(v: number) {
  if (v >= 90) return '#27AE60';
  if (v >= 75) return '#f59e0b';
  return '#ef4444';
}

function lsiLabel(v: number) {
  if (v >= 90) return 'OK';
  if (v >= 75) return 'Moderado';
  return 'Déficit';
}

function parseDate(str?: string): Date | null {
  if (!str) return null;
  // DD/MM/AAAA
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) return new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
  // MM/AAAA (fecha de lesión, etc.)
  const mmyyyy = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyy) return new Date(+mmyyyy[2], +mmyyyy[1] - 1, 1);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function calcEdad(fechaNacimiento?: string) {
  const d = parseDate(fechaNacimiento);
  if (!d) return null;
  const hoy = new Date();
  let age = hoy.getFullYear() - d.getFullYear();
  if (hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

// ── LSI Bar ──────────────────────────────────────────────────────────────────
function LsiBar({ label, value, der, izq }: { label: string; value: number | null; der: number | null; izq: number | null }) {
  if (value === null) return null;
  const color = lsiColor(value);
  const lado  = (der ?? 0) < (izq ?? 0) ? 'Izq' : 'Der';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Lado débil: {lado}</span>
          <span className="font-bold text-xs" style={{ color }}>{value}%</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: color + '18', color }}>{lsiLabel(value)}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Der: {der ? `${der}N` : '—'}</span>
        <span>Izq: {izq ? `${izq}N` : '—'}</span>
      </div>
    </div>
  );
}

function RomBar({ label, value, der, izq, unit = 'cm' }: { label: string; value: number | null; der: number | null; izq: number | null; unit?: string }) {
  if (value === null) return null;
  const color = lsiColor(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Der: {der ? `${der}${unit}` : '—'}</span>
        <span>Izq: {izq ? `${izq}${unit}` : '—'}</span>
      </div>
    </div>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
function ProgressionChart({ records }: { records: { fecha: Date; lsiCuad: number | null; lsiIsquio: number | null }[] }) {
  const filtered = records.filter(r => r.lsiCuad !== null || r.lsiIsquio !== null);
  if (filtered.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-slate-400">
        Se necesitan al menos 2 evaluaciones para mostrar progresión.
      </div>
    );
  }

  const W = 520; const H = 130; const PAD = { t: 12, b: 28, l: 32, r: 12 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const n = filtered.length;

  function pts(key: 'lsiCuad' | 'lsiIsquio') {
    return filtered
      .map((r, i) => r[key] !== null ? `${PAD.l + (i / (n - 1)) * iW},${PAD.t + iH - ((r[key]! / 100) * iH)}` : null)
      .filter(Boolean) as string[];
  }

  const cuadPts   = pts('lsiCuad');
  const isquioPts = pts('lsiIsquio');

  const guides = [70, 80, 90, 100];

  const fmt = (d: Date) => {
    const dd = new Date(d);
    return `${dd.getDate()}/${dd.getMonth() + 1}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
        {/* Grid lines */}
        {guides.map(g => {
          const y = PAD.t + iH - (g / 100) * iH;
          return (
            <g key={g}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#94a3b8">{g}%</text>
            </g>
          );
        })}
        {/* 90% line highlight */}
        <line x1={PAD.l} y1={PAD.t + iH - 0.9 * iH} x2={W - PAD.r} y2={PAD.t + iH - 0.9 * iH}
          stroke="#27AE60" strokeWidth={1} strokeDasharray="4,3" />

        {/* Cuad line */}
        {cuadPts.length >= 2 && (
          <polyline points={cuadPts.join(' ')} fill="none" stroke="#2980B9" strokeWidth={2} strokeLinejoin="round" />
        )}
        {cuadPts.map((p, i) => {
          const [x, y] = p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r={3} fill="#2980B9" />;
        })}

        {/* Isquio line */}
        {isquioPts.length >= 2 && (
          <polyline points={isquioPts.join(' ')} fill="none" stroke="#e74c3c" strokeWidth={2} strokeLinejoin="round" />
        )}
        {isquioPts.map((p, i) => {
          const [x, y] = p.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r={3} fill="#e74c3c" />;
        })}

        {/* X labels */}
        {filtered.map((r, i) => (
          <text key={i} x={PAD.l + (i / (n - 1)) * iW} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">
            {fmt(r.fecha)}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> Cuád LSI</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-500 inline-block" /> Isquio LSI</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block" style={{ borderTop: '1px dashed #27AE60' }} /> 90% objetivo</span>
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, template }: { value: string; onChange: (v: string) => void; placeholder?: string; template?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => { if (template && !value) onChange(template); }}
      onBlur={() => { if (template && value === template) onChange(''); }}
      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary resize-none" />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlanillaView({ clientId, clientName, planilla, dinamometrias, saveAction }: Props) {
  const [tab, setTab]       = useState<Tab>('dashboard');
  const [saving, startSave] = useTransition();
  const [savedMsg, setSavedMsg] = useState('');

  const initDisp = () => {
    const base: Record<string, { actividad: string; intensidad: string; obs: string }> = {};
    DIA_KEYS.forEach(k => base[k] = { actividad: '', intensidad: '', obs: '' });
    if (planilla?.disponibilidad && typeof planilla.disponibilidad === 'object') {
      Object.assign(base, planilla.disponibilidad);
    }
    return base;
  };

  const [form, setForm] = useState<PlanillaData>({
    fechaNacimiento:  planilla?.fechaNacimiento  ?? '',
    pesoCorporal:     planilla?.pesoCorporal     ?? null,
    largoTibia:       planilla?.largoTibia       ?? null,
    lugarResidencia:  planilla?.lugarResidencia  ?? '',
    diferenciaHoraria: planilla?.diferenciaHoraria ?? '',
    telefono:         planilla?.telefono         ?? '',
    fechaCxLesion:    planilla?.fechaCxLesion    ?? '',
    evolucionMeses:   planilla?.evolucionMeses   ?? null,
    fechaInicioRh:    planilla?.fechaInicioRh    ?? '',
    evolucionRhRf:    planilla?.evolucionRhRf    ?? '',
    lesionesCx:       planilla?.lesionesCx       ?? '',
    fechasLesiones:   planilla?.fechasLesiones   ?? '',
    antecedentes:     planilla?.antecedentes     ?? '',
    comportDolor:     planilla?.comportDolor     ?? '',
    estudiosComp:     planilla?.estudiosComp     ?? '',
    trabajoProfesion: planilla?.trabajoProfesion ?? '',
    motivoConsulta:   planilla?.motivoConsulta   ?? '',
    expectativas:     planilla?.expectativas     ?? '',
    objCorto:         planilla?.objCorto         ?? '',
    objMediano:       planilla?.objMediano       ?? '',
    objLargo:         planilla?.objLargo         ?? '',
    tiempoEntrenando: planilla?.tiempoEntrenando ?? '',
    vecesXSemana:     planilla?.vecesXSemana     ?? '',
    tipoEntrenamiento: planilla?.tipoEntrenamiento ?? '',
    lesionesPrevias:  planilla?.lesionesPrevias  ?? '',
    dondeEntrenar:    planilla?.dondeEntrenar    ?? '',
    elementosDisp:    planilla?.elementosDisp    ?? '',
    tiempoDisponible: planilla?.tiempoDisponible ?? '',
    observaciones:    planilla?.observaciones    ?? '',
    disponibilidad:   initDisp(),
  });

  const set = (key: keyof PlanillaData) => (val: string | number | null) =>
    setForm(f => ({ ...f, [key]: val }));

  const setDisp = (dia: string, field: 'actividad' | 'intensidad' | 'obs', val: string) =>
    setForm(f => {
      const prev = (f.disponibilidad?.[dia] ?? {}) as Partial<{ actividad: string; intensidad: string; obs: string }>;
      const entry = { actividad: prev.actividad ?? '', intensidad: prev.intensidad ?? '', obs: prev.obs ?? '', [field]: val };
      return { ...f, disponibilidad: { ...(f.disponibilidad ?? {}), [dia]: entry } };
    });

  function handleSave() {
    startSave(async () => {
      await saveAction(clientId, form);
      setSavedMsg('✓ Guardado');
      setTimeout(() => setSavedMsg(''), 2500);
    });
  }

  // ── Dashboard data ────────────────────────────────────────────────────────
  const latest = dinamometrias.at(-1);
  const edad   = calcEdad(form.fechaNacimiento ?? undefined);

  const lsiCuad    = lsi(latest?.cuadDer ?? null,    latest?.cuadIzq ?? null);
  const lsiIsquio  = lsi(latest?.isquioDer ?? null,  latest?.isquioIzq ?? null);
  const lsiAbd     = lsi(latest?.abdDer ?? null,     latest?.abdIzq ?? null);
  const lsiEversor = lsi(latest?.eversorDer ?? null, latest?.eversorIzq ?? null);
  const lsiCadera  = lsi(latest?.romCaderaDer ?? null, latest?.romCaderaIzq ?? null);
  const lsiTobillo = lsi(latest?.romTobilloDer ?? null, latest?.romTobilloIzq ?? null);

  const chartData = dinamometrias.map(d => ({
    fecha:     d.fecha,
    lsiCuad:   lsi(d.cuadDer, d.cuadIzq),
    lsiIsquio: lsi(d.isquioDer, d.isquioIzq),
  }));

  const tieneMetricas = latest && (lsiCuad !== null || lsiIsquio !== null || lsiAbd !== null);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'entrevista', label: 'Entrevista' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center gap-3 px-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="Logo" width={34} height={34} className="object-contain" unoptimized />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-title font-bold text-primary text-sm">Planilla del Atleta</span>
            <span className="text-[10px] text-slate-400">{clientName}</span>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-200 shrink-0" />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`h-8 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === t.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {tab === 'entrevista' && (
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? 'Guardando…' : savedMsg || 'Guardar'}
          </button>
        )}

        <a href={`/professional/planillas/${clientId}/print`} target="_blank" rel="noopener noreferrer"
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar PDF
        </a>

        <a href="/professional/planillas"
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Pacientes
        </a>
      </header>

      {/* ── DASHBOARD ────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Datos clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Atleta',       value: clientName },
              { label: 'Edad',         value: edad ? `${edad} años` : '—' },
              { label: 'Peso',         value: (form.pesoCorporal ?? latest?.peso) ? `${form.pesoCorporal ?? latest?.peso} kg` : '—' },
              { label: 'Evolución',    value: form.evolucionMeses ? `${form.evolucionMeses} meses` : '—' },
            ].map(d => (
              <div key={d.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d.label}</p>
                <p className="font-title font-bold text-primary text-xl mt-1">{d.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Fuerza LSI */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuerza LSI</p>
                {latest && <p className="text-[10px] text-slate-400">Última eval: {new Date(latest.fecha).toLocaleDateString('es-AR')}</p>}
              </div>
              {!tieneMetricas ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin evaluaciones dinamométricas todavía.</p>
              ) : (
                <div className="space-y-4">
                  <LsiBar label="Cuádriceps" value={lsiCuad} der={latest?.cuadDer ?? null} izq={latest?.cuadIzq ?? null} />
                  <LsiBar label="Isquiotibiales" value={lsiIsquio} der={latest?.isquioDer ?? null} izq={latest?.isquioIzq ?? null} />
                  <LsiBar label="Abductores" value={lsiAbd} der={latest?.abdDer ?? null} izq={latest?.abdIzq ?? null} />
                  <LsiBar label="Eversores tobillo" value={lsiEversor} der={latest?.eversorDer ?? null} izq={latest?.eversorIzq ?? null} />
                </div>
              )}
            </div>

            {/* ROM LSI */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Movilidad LSI</p>
              {!tieneMetricas ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin evaluaciones todavía.</p>
              ) : (
                <div className="space-y-4">
                  <RomBar label="ROM Cadera flexión" value={lsiCadera} der={latest?.romCaderaDer ?? null} izq={latest?.romCaderaIzq ?? null} />
                  <RomBar label="ROM Tobillo (Lunge Test)" value={lsiTobillo} der={latest?.romTobilloDer ?? null} izq={latest?.romTobilloIzq ?? null} />
                  {latest?.velocidadSquat && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Velocidad Squat</span>
                        <span className="font-bold text-secondary">{latest.velocidadSquat} m/s</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progresión */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Progresión LSI Fuerza</p>
            <ProgressionChart records={chartData} />
          </div>

        </div>
      )}

      {/* ── ENTREVISTA ───────────────────────────────────────────────── */}
      {tab === 'entrevista' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24">

          {/* Datos personales */}
          <Section title="Datos personales">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Fecha de nacimiento">
                <TextInput value={form.fechaNacimiento ?? ''} onChange={set('fechaNacimiento')} placeholder="DD/MM/AAAA" template="DD/MM/AAAA" />
              </Field>
              <Field label="Peso corporal (kg)">
                <input type="number" value={form.pesoCorporal ?? ''} onChange={e => set('pesoCorporal')(e.target.value ? +e.target.value : null)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-primary" />
              </Field>
              <Field label="Largo tibia (cm)">
                <input type="number" value={form.largoTibia ?? ''} onChange={e => set('largoTibia')(e.target.value ? +e.target.value : null)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-primary" />
              </Field>
              <Field label="Lugar de residencia">
                <TextInput value={form.lugarResidencia ?? ''} onChange={set('lugarResidencia')} placeholder="Ciudad, País" template="Ciudad, País" />
              </Field>
              <Field label="Diferencia horaria">
                <TextInput value={form.diferenciaHoraria ?? ''} onChange={set('diferenciaHoraria')} placeholder="+2hs, -3hs..." template="+0hs" />
              </Field>
              <Field label="Teléfono">
                <TextInput value={form.telefono ?? ''} onChange={set('telefono')} placeholder="+54 9 11..." template="+54 9 11 " />
              </Field>
            </div>
          </Section>

          {/* Lesión & evolución */}
          <Section title="Lesión & Evolución">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <Field label="Fecha Cx / lesión">
                <TextInput value={form.fechaCxLesion ?? ''} onChange={set('fechaCxLesion')} placeholder="MM/AAAA" template="MM/AAAA" />
              </Field>
              <Field label="Evolución (meses)">
                <input type="number" value={form.evolucionMeses ?? ''} onChange={e => set('evolucionMeses')(e.target.value ? +e.target.value : null)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-primary" />
              </Field>
              <Field label="Fecha inicio Rh">
                <TextInput value={form.fechaInicioRh ?? ''} onChange={set('fechaInicioRh')} placeholder="MM/AAAA" template="MM/AAAA" />
              </Field>
              <Field label="Evolución Rh/RF">
                <TextInput value={form.evolucionRhRf ?? ''} onChange={set('evolucionRhRf')} placeholder="Ej: 6 meses Rh" template="0 meses Rh" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Lesiones / cirugías">
                <Textarea value={form.lesionesCx ?? ''} onChange={set('lesionesCx')} placeholder="Descripción de la lesión o cirugía..." />
              </Field>
              <Field label="Fechas de lesiones">
                <Textarea value={form.fechasLesiones ?? ''} onChange={set('fechasLesiones')} placeholder="Cronología de lesiones..." />
              </Field>
              <Field label="Antecedentes">
                <Textarea value={form.antecedentes ?? ''} onChange={set('antecedentes')} placeholder="Antecedentes médicos relevantes..." />
              </Field>
              <Field label="Comportamiento del dolor">
                <Textarea value={form.comportDolor ?? ''} onChange={set('comportDolor')} placeholder="EVA, cuándo duele, qué lo alivia..." />
              </Field>
              <Field label="Estudios complementarios">
                <Textarea value={form.estudiosComp ?? ''} onChange={set('estudiosComp')} placeholder="RMN, Rx, ecografía..." />
              </Field>
              <Field label="Trabajo / profesión">
                <Textarea value={form.trabajoProfesion ?? ''} onChange={set('trabajoProfesion')} placeholder="Actividad laboral y demandas físicas..." />
              </Field>
            </div>
          </Section>

          {/* Objetivos */}
          <Section title="Objetivos & Expectativas">
            <div className="space-y-4">
              <Field label="Motivo de consulta">
                <Textarea value={form.motivoConsulta ?? ''} onChange={set('motivoConsulta')} placeholder="¿Por qué viene a consultar?" />
              </Field>
              <Field label="Expectativas">
                <Textarea value={form.expectativas ?? ''} onChange={set('expectativas')} placeholder="¿Qué espera lograr?" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Objetivo corto plazo (1 año)">
                  <Textarea value={form.objCorto ?? ''} onChange={set('objCorto')} placeholder="Meta a 12 meses..." rows={3} />
                </Field>
                <Field label="Objetivo mediano plazo (2-3 años)">
                  <Textarea value={form.objMediano ?? ''} onChange={set('objMediano')} placeholder="Meta a 2-3 años..." rows={3} />
                </Field>
                <Field label="Objetivo largo plazo (3-5 años)">
                  <Textarea value={form.objLargo ?? ''} onChange={set('objLargo')} placeholder="Meta a largo plazo..." rows={3} />
                </Field>
              </div>
            </div>
          </Section>

          {/* Experiencia deportiva */}
          <Section title="Experiencia Deportiva">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tiempo entrenando">
                <TextInput value={form.tiempoEntrenando ?? ''} onChange={set('tiempoEntrenando')} placeholder="Ej: 5 años" template="0 años" />
              </Field>
              <Field label="Veces por semana">
                <TextInput value={form.vecesXSemana ?? ''} onChange={set('vecesXSemana')} placeholder="Ej: 4 veces/semana" template="0 veces/semana" />
              </Field>
              <Field label="Tipo de entrenamiento">
                <Textarea value={form.tipoEntrenamiento ?? ''} onChange={set('tipoEntrenamiento')} placeholder="Fútbol, ciclismo, gym, crossfit..." rows={2} />
              </Field>
              <Field label="Lesiones previas">
                <Textarea value={form.lesionesPrevias ?? ''} onChange={set('lesionesPrevias')} placeholder="Lesiones anteriores relevantes..." rows={2} />
              </Field>
            </div>
          </Section>

          {/* Disponibilidad semanal */}
          <Section title="Disponibilidad para Entrenar">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-4 w-12">Día</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-4">Actividad</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-4">Intensidad</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {DIA_KEYS.map((k, i) => {
                    const d = (form.disponibilidad ?? {})[k] ?? { actividad: '', intensidad: '', obs: '' };
                    return (
                      <tr key={k} className="border-b border-slate-50">
                        <td className="py-1.5 pr-4">
                          <span className="text-xs font-bold text-slate-500">{DIAS[i]}</span>
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={d.actividad} onChange={e => setDisp(k, 'actividad', e.target.value)}
                            placeholder="Gym, Cancha..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-primary bg-white" />
                        </td>
                        <td className="py-1.5 pr-2 w-32">
                          <select value={d.intensidad} onChange={e => setDisp(k, 'intensidad', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-primary bg-white">
                            <option value="">—</option>
                            <option>Baja</option>
                            <option>Media</option>
                            <option>Alta</option>
                            <option>Máxima</option>
                            <option>Descanso</option>
                          </select>
                        </td>
                        <td className="py-1.5">
                          <input value={d.obs} onChange={e => setDisp(k, 'obs', e.target.value)}
                            placeholder="Notas..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-primary bg-white" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Materiales / Lugar */}
          <Section title="Materiales & Lugar">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="¿Dónde entrena?">
                <Textarea value={form.dondeEntrenar ?? ''} onChange={set('dondeEntrenar')} placeholder="Gym, casa, cancha, al aire libre..." rows={2} />
              </Field>
              <Field label="Elementos disponibles">
                <Textarea value={form.elementosDisp ?? ''} onChange={set('elementosDisp')} placeholder="Mancuernas, bandas, barra, máquinas..." rows={2} />
              </Field>
              <Field label="Tiempo disponible por sesión">
                <TextInput value={form.tiempoDisponible ?? ''} onChange={set('tiempoDisponible')} placeholder="Ej: 60-90 min" template="60 min" />
              </Field>
            </div>
          </Section>

          {/* Observaciones */}
          <Section title="Observaciones generales">
            <Textarea value={form.observaciones ?? ''} onChange={set('observaciones')} placeholder="Notas adicionales..." rows={4} />
          </Section>

          {/* Save floating bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-30">
            <p className="text-xs text-slate-400">
              {planilla?.updatedAt ? `Última actualización: ${new Date(planilla.updatedAt).toLocaleString('es-AR')}` : 'Sin guardar todavía'}
            </p>
            <button onClick={handleSave} disabled={saving}
              className="h-9 px-6 rounded-xl bg-accent text-white text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? 'Guardando…' : savedMsg || 'Guardar planilla'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}