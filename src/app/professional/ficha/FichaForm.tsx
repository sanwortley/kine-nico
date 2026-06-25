'use client';

import { useState, useTransition } from 'react';
import type { FichaInput, RomTest, FuerzaTest } from '@/modules/ficha/actions';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  clients: { id: string; name: string }[];
  saveAction: (data: FichaInput) => Promise<{ success: boolean; error?: string }>;
}

const TABS = ['Datos', 'Historial', 'ROM', 'Fuerza', 'Capacidad', 'Observaciones'] as const;
type Tab = typeof TABS[number];

// ── Tests ROM ────────────────────────────────────────────────────────────────

const ROM_PRUEBAS = [
  'Sentadilla con brazos estirados',
  'Paso de valla',
  'Estocada',
  'Movilidad de hombros',
  'Elevación activa pierna recta',
  'Estabilidad de tronco en flexión',
  'Estabilidad de tronco en rotación',
  'Dorsiflexión tobillo',
  'Flexión activa de rodilla',
  'Rotación interna cadera',
  'Rotación externa de cadera',
  'Cadena posterior (test del cajón)',
  'Rotación de tórax',
];

function initRom(): RomTest[] {
  return ROM_PRUEBAS.map(p => ({ prueba: p, der: '', izq: '', total: '', obs: '' }));
}

// ── Tests Fuerza ─────────────────────────────────────────────────────────────

const EJERCICIOS = [
  'Sentadilla trasera',
  'Press banca',
  'Peso muerto',
  'Press militar (OHP)',
  'Dominadas (lastre+PC)',
  'Sentadilla frontal',
  'Hip thrust',
  'Remo con barra',
];

function initFuerza(): FuerzaTest[] {
  return EJERCICIOS.map(e => ({ ejercicio: e, peso: '', reps: '' }));
}

function calc1rm(peso: string, reps: string): string {
  const p = parseFloat(peso); const r = parseFloat(reps);
  if (!p || !r || r < 1) return '';
  return String(Math.round(p * (1 + r / 30) * 10) / 10);
}

function calcNivel(pct: number): string {
  if (pct < 75) return 'Novato';
  if (pct < 100) return 'Principiante';
  if (pct < 125) return 'Intermedio';
  if (pct < 150) return 'Avanzado';
  return 'Elite';
}

// ── Tests capacidad ───────────────────────────────────────────────────────────

const CAPACIDAD_GROUPS: { label: string; key: string; ref: string; unit?: string }[][] = [
  [
    { label: 'CMJ — Salto vertical', key: 'cmj', ref: '>32-40 cm (H) >24-32 cm (M)', unit: 'cm' },
    { label: 'SJ — Sin contramov.', key: 'sj', ref: '>28-35 cm (H) >20-28 cm (M)', unit: 'cm' },
    { label: 'Sprint 30 metros', key: 'sprint30', ref: '<4 s (H) <4.5 s (M)', unit: 's' },
    { label: 'Plancha isométrica', key: 'plancha', ref: '>60 s saludable / >90-120 s atleta', unit: 's' },
    { label: 'Velocidad squat 40kg', key: 'velSquat', ref: 'm/s', unit: 'm/s' },
    { label: 'VO₂max Cooper (est.)', key: 'vo2max', ref: '>45 (H) >38 (M)', unit: 'ml/kg/min' },
    { label: '1 km — tiempo', key: 'km1', ref: '<4:30', unit: 'min:s' },
  ],
  [
    { label: 'Abalakov', key: 'abalakov', ref: '>40 cm (H) >30 cm (M)', unit: 'cm' },
    { label: 'DJ 30 cm', key: 'dj30', ref: '<1 MP / 1-1.5 P / 1.5-2 M', unit: '' },
    { label: 'RSI mod', key: 'rsiMod', ref: '>0.45 bueno / >0.6 elite', unit: '' },
    { label: 'Salto horizontal', key: 'saltoHoriz', ref: '>200 cm (H) >150 cm (M)', unit: 'cm' },
    { label: 'CMJ unipodal asim.', key: 'cmjUni', ref: '<10-15 %', unit: '%' },
    { label: 'DJ unipodal asim.', key: 'djUni', ref: '<10-15 %', unit: '%' },
    { label: 'Multisaltos 10-10', key: 'multisaltos', ref: '<10-15 %', unit: '' },
  ],
  [
    { label: 'Single Hop', key: 'singleHop', ref: '90-110 %', unit: '%' },
    { label: 'Triple Hop', key: 'tripleHop', ref: '90-110 %', unit: '%' },
    { label: 'Crossover Hop', key: 'crossHop', ref: '90-110 %', unit: '%' },
    { label: '6m Timed Hop', key: 'timedHop', ref: '90-110 %', unit: '%' },
    { label: 'Side Hop', key: 'sideHop', ref: '90-100 %', unit: '%' },
  ],
];

// ── Dinamometría extendida ────────────────────────────────────────────────────

const DINAMO_MUSCLES: { label: string; key: string }[] = [
  { label: 'Cuádriceps', key: 'cuad' },
  { label: 'Isquiotibiales', key: 'isquio' },
  { label: 'Abductores', key: 'abd' },
  { label: 'Adductores', key: 'add' },
  { label: 'Eversores tobillo', key: 'eversor' },
  { label: 'Flexores tobillo', key: 'flexTob' },
  { label: 'Extensores tobillo', key: 'extTob' },
  { label: 'Rot. int. hombro', key: 'rotIntHombro' },
  { label: 'Rot. ext. hombro', key: 'rotExtHombro' },
  { label: 'Abducción hombro', key: 'abdHombro' },
  { label: 'Aducción hombro', key: 'addHombro' },
  { label: 'Handgrip', key: 'handgrip' },
];

// ── UI helpers ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white placeholder-slate-300 ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary resize-none placeholder-slate-300"
    />
  );
}

function pctDiff(a: string, b: string): number | null {
  const x = parseFloat(a); const y = parseFloat(b);
  if (!x || !y) return null;
  return Math.round(((Math.max(x, y) - Math.min(x, y)) / Math.max(x, y)) * 1000) / 10;
}

function DiffBadge({ a, b }: { a: string; b: string }) {
  const d = pctDiff(a, b);
  if (d === null) return <span className="text-slate-300 text-xs">—</span>;
  const cls = d < 10 ? 'bg-green-100 text-green-700' : d < 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{d}%</span>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FichaForm({ clients, saveAction }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Datos');
  const [clientId, setClientId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Datos básicos
  const [datos, setDatos] = useState({ peso: '', altura: '', sexo: '', grasaEst: '', deporte: '', catPeso: '' });
  const setD = (k: keyof typeof datos, v: string) => setDatos(p => ({ ...p, [k]: v }));

  // Historia
  const [hist, setHist] = useState({
    anosEntrenando: '', lesionesPasadas: '', lesionesActivas: '', limitaciones: '',
    medicacion: '', cirugias: '', deportePrevio: '', frecuencia: '', ultimaCompetencia: '', objetivo: '',
  });
  const setH = (k: keyof typeof hist, v: string) => setHist(p => ({ ...p, [k]: v }));

  // ROM
  const [rom, setRom] = useState<RomTest[]>(initRom);
  const setRomField = (i: number, k: keyof RomTest, v: string) =>
    setRom(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  // Fuerza
  const [fuerza, setFuerza] = useState<FuerzaTest[]>(initFuerza);
  const setFuerzaField = (i: number, k: keyof FuerzaTest, v: string) =>
    setFuerza(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  // Capacidad
  const [cap, setCap] = useState<Record<string, string>>({});
  const setCF = (k: string, v: string) => setCap(p => ({ ...p, [k]: v }));

  // Dinamometría extendida
  const [dinamo, setDinamo] = useState<Record<string, string>>({});
  const setDinamoF = (k: string, v: string) => setDinamo(p => ({ ...p, [k]: v }));

  // Observaciones
  const [obs, setObs] = useState({
    fortalezas: '', debilidades: '', prioridades: '', restricciones: '', objetivos12sem: '', fechaReevaluacion: '', notas: '',
  });
  const setO = (k: keyof typeof obs, v: string) => setObs(p => ({ ...p, [k]: v }));

  // Cálculos en vivo — Datos
  const pesoN = parseFloat(datos.peso);
  const alturaM = parseFloat(datos.altura) / 100;
  const imcVal = (pesoN && alturaM > 0) ? Math.round(pesoN / (alturaM * alturaM) * 10) / 10 : null;

  function reset() {
    setClientId(''); setFecha(new Date().toISOString().slice(0, 10));
    setDatos({ peso: '', altura: '', sexo: '', grasaEst: '', deporte: '', catPeso: '' });
    setHist({ anosEntrenando: '', lesionesPasadas: '', lesionesActivas: '', limitaciones: '', medicacion: '', cirugias: '', deportePrevio: '', frecuencia: '', ultimaCompetencia: '', objetivo: '' });
    setRom(initRom()); setFuerza(initFuerza()); setCap({}); setDinamo({});
    setObs({ fortalezas: '', debilidades: '', prioridades: '', restricciones: '', objetivos12sem: '', fechaReevaluacion: '', notas: '' });
    setActiveTab('Datos');
  }

  function handleSave() {
    if (!clientId) { setError('Seleccioná un paciente'); return; }
    setError('');
    startTransition(async () => {
      const res = await saveAction({
        clientId, fecha,
        peso: pesoN || undefined, altura: parseFloat(datos.altura) || undefined,
        sexo: datos.sexo || undefined, grasaEst: parseFloat(datos.grasaEst) || undefined,
        deporte: datos.deporte || undefined, catPeso: datos.catPeso || undefined,
        historia: hist,
        romTests: rom,
        fuerzaTests: fuerza,
        capacidadTests: cap,
        dinamoExt: dinamo,
        ...obs,
        fechaReevaluacion: obs.fechaReevaluacion || undefined,
      });
      if (res.success) { setSaved(true); reset(); setOpen(false); }
      else setError(res.error || 'Error al guardar');
    });
  }

  return (
    <div className="space-y-4">
      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); setSaved(false); setError(''); }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-all text-sm font-semibold w-full justify-center"
      >
        <span className={`text-lg leading-none transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
        {open ? 'Cancelar' : 'Nueva ficha'}
      </button>

      {saved && !open && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-semibold">✓ Ficha guardada correctamente</div>
      )}

      {open && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Header paciente + fecha */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <Field label="Paciente">
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">Seleccioná un paciente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="min-w-[140px]">
              <Field label="Fecha">
                <Input type="date" value={fecha} onChange={v => setFecha(v)} />
              </Field>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Contenido por tab */}
          <div className="p-4 space-y-4">

            {/* ── TAB: Datos personales ─────────────────────── */}
            {activeTab === 'Datos' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Peso (kg)"><Input value={datos.peso} onChange={v => setD('peso', v)} placeholder="—" type="number" /></Field>
                  <Field label="Altura (cm)"><Input value={datos.altura} onChange={v => setD('altura', v)} placeholder="—" type="number" /></Field>
                  <Field label="IMC">
                    <div className="h-9 flex items-center px-3 rounded-lg border border-slate-100 bg-slate-50">
                      <span className={`text-sm font-bold ${!imcVal ? 'text-slate-300' : imcVal < 18.5 ? 'text-blue-600' : imcVal < 25 ? 'text-green-600' : imcVal < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {imcVal ?? '—'}
                      </span>
                    </div>
                  </Field>
                  <Field label="Sexo (H/M)">
                    <select value={datos.sexo} onChange={e => setD('sexo', e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white">
                      <option value="">—</option>
                      <option value="H">Hombre</option>
                      <option value="M">Mujer</option>
                    </select>
                  </Field>
                  <Field label="% Grasa estimado"><Input value={datos.grasaEst} onChange={v => setD('grasaEst', v)} placeholder="—" type="number" /></Field>
                  <Field label="Categoría de peso"><Input value={datos.catPeso} onChange={v => setD('catPeso', v)} placeholder="—" /></Field>
                </div>
                <Field label="Deporte / disciplina"><Input value={datos.deporte} onChange={v => setD('deporte', v)} placeholder="Fútbol, atletismo..." /></Field>
              </>
            )}

            {/* ── TAB: Historial ─────────────────────────────── */}
            {activeTab === 'Historial' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Años entrenando"><Input value={hist.anosEntrenando} onChange={v => setH('anosEntrenando', v)} placeholder="—" type="number" /></Field>
                  <Field label="Frecuencia sem/año"><Input value={hist.frecuencia} onChange={v => setH('frecuencia', v)} placeholder="—" /></Field>
                  <Field label="Deporte previo"><Input value={hist.deportePrevio} onChange={v => setH('deportePrevio', v)} placeholder="—" /></Field>
                  <Field label="Última competencia"><Input value={hist.ultimaCompetencia} onChange={v => setH('ultimaCompetencia', v)} placeholder="—" /></Field>
                </div>
                <Field label="Lesiones pasadas"><Textarea value={hist.lesionesPasadas} onChange={v => setH('lesionesPasadas', v)} placeholder="Descripción de lesiones previas..." /></Field>
                <Field label="Lesiones activas"><Textarea value={hist.lesionesActivas} onChange={v => setH('lesionesActivas', v)} placeholder="Lesiones actuales..." /></Field>
                <Field label="Limitaciones físicas"><Textarea value={hist.limitaciones} onChange={v => setH('limitaciones', v)} placeholder="—" /></Field>
                <Field label="Medicación relevante"><Input value={hist.medicacion} onChange={v => setH('medicacion', v)} placeholder="—" /></Field>
                <Field label="Cirugías previas"><Input value={hist.cirugias} onChange={v => setH('cirugias', v)} placeholder="—" /></Field>
                <Field label="Objetivo principal"><Textarea value={hist.objetivo} onChange={v => setH('objetivo', v)} placeholder="—" /></Field>
              </div>
            )}

            {/* ── TAB: ROM / FMS ─────────────────────────────── */}
            {activeTab === 'ROM' && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-3">Puntuación: 0 = dolor · 1 = no pasa · 2 = con compensación · 3 = correcto</p>
                <div className="overflow-x-auto -mx-1">
                  <div className="min-w-[540px] px-1 space-y-1">
                    <div className="grid grid-cols-[1fr_56px_56px_56px_96px] gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1 pb-1">
                      <span>Prueba</span><span className="text-center">Der</span><span className="text-center">Izq</span><span className="text-center">Total</span><span>Obs.</span>
                    </div>
                    {rom.map((r, i) => (
                      <div key={r.prueba} className="grid grid-cols-[1fr_56px_56px_56px_96px] gap-2 items-center py-2 border-b border-slate-50 last:border-0">
                        <span className="text-xs text-slate-700 font-medium leading-tight">{r.prueba}</span>
                        <input type="number" min="0" max="3" value={r.der} onChange={e => setRomField(i, 'der', e.target.value)}
                          className="h-8 w-full text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                        <input type="number" min="0" max="3" value={r.izq} onChange={e => setRomField(i, 'izq', e.target.value)}
                          className="h-8 w-full text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                        <input type="number" min="0" max="3" value={r.total} onChange={e => setRomField(i, 'total', e.target.value)}
                          className="h-8 w-full text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                        <input type="text" value={r.obs} onChange={e => setRomField(i, 'obs', e.target.value)} placeholder="—"
                          className="h-8 w-full px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-primary" />
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between text-xs text-slate-500">
                      <span>Total ROM:</span>
                      <span className="font-bold text-slate-800">{rom.reduce((s, r) => s + (parseInt(r.total) || 0), 0)} / {ROM_PRUEBAS.length * 3}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Fuerza ────────────────────────────────── */}
            {activeTab === 'Fuerza' && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-3">1RM estimado con fórmula de Epley: peso × (1 + reps/30)</p>
                <div className="overflow-x-auto -mx-1">
                  <div className="min-w-[480px] px-1 space-y-1">
                    <div className="grid grid-cols-[140px_72px_56px_72px_56px_84px] gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1 pb-1">
                      <span>Ejercicio</span><span>Peso (kg)</span><span>Reps</span><span>1RM est.</span><span>%PC</span><span>Nivel</span>
                    </div>
                    {fuerza.map((f, i) => {
                      const rm = calc1rm(f.peso, f.reps);
                      const pctPC = pesoN && rm ? Math.round(parseFloat(rm) / pesoN * 100) : null;
                      const nivel = pctPC ? calcNivel(pctPC) : '—';
                      const nivelColor = nivel === 'Elite' ? 'text-purple-600' : nivel === 'Avanzado' ? 'text-blue-600' : nivel === 'Intermedio' ? 'text-green-600' : nivel === 'Principiante' ? 'text-amber-600' : 'text-slate-400';
                      return (
                        <div key={f.ejercicio} className="grid grid-cols-[140px_72px_56px_72px_56px_84px] gap-2 items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-xs text-slate-700 font-medium leading-tight">{f.ejercicio}</span>
                          <input type="number" value={f.peso} onChange={e => setFuerzaField(i, 'peso', e.target.value)} placeholder="—"
                            className="h-8 w-full px-2 text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                          <input type="number" value={f.reps} onChange={e => setFuerzaField(i, 'reps', e.target.value)} placeholder="—"
                            className="h-8 w-full px-2 text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                          <div className="h-8 flex items-center justify-center text-sm font-bold text-primary bg-primary/5 rounded-lg">
                            {rm || '—'}<span className="text-[10px] text-slate-400 ml-0.5">kg</span>
                          </div>
                          <div className="h-8 flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50 rounded-lg">
                            {pctPC ? `${pctPC}%` : '—'}
                          </div>
                          <div className={`h-8 flex items-center justify-center text-xs font-bold ${nivelColor}`}>
                            {nivel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!datos.peso && (
                  <p className="text-xs text-amber-600 mt-2">* Ingresá el peso corporal en "Datos" para calcular el % PC</p>
                )}
              </div>
            )}

            {/* ── TAB: Capacidad física ──────────────────────── */}
            {activeTab === 'Capacidad' && (
              <div className="space-y-5">
                {CAPACIDAD_GROUPS.map((group, gi) => (
                  <div key={gi}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">
                      {gi === 0 ? 'Tests generales' : gi === 1 ? 'Tests de salto bilateral' : 'Tests hop (unipodal)'}
                    </p>
                    <div className="space-y-1">
                      {group.map(t => (
                        <div key={t.key} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{t.label}</p>
                            <p className="text-[10px] text-slate-400">{t.ref}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="text" value={cap[t.key] ?? ''} onChange={e => setCF(t.key, e.target.value)} placeholder="—"
                              className="h-8 w-20 px-2 text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                            />
                            {t.unit && <span className="text-[10px] text-slate-400 w-10">{t.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Dinamometría extendida */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Fuerza isométrica (N) — Dinamometría extendida</p>
                  <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1 pb-1">
                    <span>Músculo</span><span className="text-center">Der</span><span className="text-center">Izq</span><span className="text-center">Asim.</span>
                  </div>
                  {DINAMO_MUSCLES.map(m => (
                    <div key={m.key} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-700 font-medium">{m.label}</span>
                      <input type="number" value={dinamo[`${m.key}Der`] ?? ''} onChange={e => setDinamoF(`${m.key}Der`, e.target.value)} placeholder="—"
                        className="h-8 w-full px-2 text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                      <input type="number" value={dinamo[`${m.key}Izq`] ?? ''} onChange={e => setDinamoF(`${m.key}Izq`, e.target.value)} placeholder="—"
                        className="h-8 w-full px-2 text-center rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" />
                      <DiffBadge a={dinamo[`${m.key}Der`] ?? ''} b={dinamo[`${m.key}Izq`] ?? ''} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Observaciones ─────────────────────────── */}
            {activeTab === 'Observaciones' && (
              <div className="space-y-3">
                <Field label="Principales fortalezas"><Textarea value={obs.fortalezas} onChange={v => setO('fortalezas', v)} placeholder="—" /></Field>
                <Field label="Principales debilidades"><Textarea value={obs.debilidades} onChange={v => setO('debilidades', v)} placeholder="—" /></Field>
                <Field label="Prioridades de trabajo"><Textarea value={obs.prioridades} onChange={v => setO('prioridades', v)} placeholder="—" /></Field>
                <Field label="Restricciones a considerar"><Textarea value={obs.restricciones} onChange={v => setO('restricciones', v)} placeholder="—" /></Field>
                <Field label="Objetivos a 12 semanas"><Textarea value={obs.objetivos12sem} onChange={v => setO('objetivos12sem', v)} placeholder="—" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha de re-evaluación"><Input type="date" value={obs.fechaReevaluacion} onChange={v => setO('fechaReevaluacion', v)} /></Field>
                </div>
                <Field label="Notas generales"><Textarea value={obs.notas} onChange={v => setO('notas', v)} placeholder="—" /></Field>
              </div>
            )}

            {/* Navegación entre tabs + guardar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab(TABS[Math.max(0, TABS.indexOf(activeTab) - 1)])}
                  disabled={activeTab === TABS[0]}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setActiveTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(activeTab) + 1)])}
                  disabled={activeTab === TABS[TABS.length - 1]}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              {activeTab === 'Observaciones' && (
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-sm hover:bg-secondary transition-all disabled:opacity-50"
                >
                  {isPending ? 'Guardando...' : 'Guardar ficha'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}