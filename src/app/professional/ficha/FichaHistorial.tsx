'use client';

import { useState } from 'react';

interface Row {
  id: string;
  fecha: string;
  client: { name: string };
  peso?: number | null;
  altura?: number | null;
  deporte?: string | null;
  romTests?: any;
  fuerzaTests?: any;
  capacidadTests?: any;
  dinamoExt?: any;
  historia?: any;
  fortalezas?: string | null;
  debilidades?: string | null;
  prioridades?: string | null;
  restricciones?: string | null;
  objetivos12sem?: string | null;
  fechaReevaluacion?: string | null;
  notas?: string | null;
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function imc(p?: number | null, h?: number | null) {
  if (!p || !h) return null;
  const hm = h / 100;
  return Math.round(p / (hm * hm) * 10) / 10;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 min-w-[160px] shrink-0">{label}</span>
      <span className="text-xs text-slate-700 font-medium">{value}</span>
    </div>
  );
}

function RowCard({ r }: { r: Row }) {
  const [open, setOpen] = useState(false);
  const imcVal = imc(r.peso, r.altura);
  const romTotal = Array.isArray(r.romTests)
    ? r.romTests.reduce((s: number, t: any) => s + (parseInt(t.total) || 0), 0) : null;

  const summary = [
    r.deporte, r.peso ? `${r.peso} kg` : null, imcVal ? `IMC ${imcVal}` : null,
    romTotal !== null ? `ROM ${romTotal}/39` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-slate-800 text-sm">{r.client.name}</p>
          <p className="text-xs text-slate-400">{fmtFecha(r.fecha)}</p>
        </div>
        <div className="flex items-center gap-3">
          {summary && <p className="hidden sm:block text-xs text-slate-400">{summary}</p>}
          <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-5">

          {/* Datos básicos */}
          <Section title="Datos personales">
            <KV label="Peso" value={r.peso ? `${r.peso} kg` : null} />
            <KV label="Altura" value={r.altura ? `${r.altura} cm` : null} />
            <KV label="IMC" value={imcVal} />
            <KV label="Deporte" value={r.deporte} />
          </Section>

          {/* Historia */}
          {r.historia && Object.values(r.historia).some(Boolean) && (
            <Section title="Historial">
              <KV label="Años entrenando" value={r.historia.anosEntrenando} />
              <KV label="Lesiones pasadas" value={r.historia.lesionesPasadas} />
              <KV label="Lesiones activas" value={r.historia.lesionesActivas} />
              <KV label="Objetivo principal" value={r.historia.objetivo} />
            </Section>
          )}

          {/* ROM */}
          {Array.isArray(r.romTests) && r.romTests.some((t: any) => t.total) && (
            <Section title={`ROM / FMS — Total ${romTotal}/39`}>
              <div className="grid grid-cols-[1fr_40px_40px_40px] gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold py-1">
                <span>Prueba</span><span className="text-center">D</span><span className="text-center">I</span><span className="text-center">T</span>
              </div>
              {r.romTests.filter((t: any) => t.total || t.der || t.izq).map((t: any) => (
                <div key={t.prueba} className="grid grid-cols-[1fr_40px_40px_40px] gap-1 py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-600">{t.prueba}</span>
                  <span className="text-xs text-center font-mono text-slate-700">{t.der || '—'}</span>
                  <span className="text-xs text-center font-mono text-slate-700">{t.izq || '—'}</span>
                  <span className="text-xs text-center font-bold text-primary">{t.total || '—'}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Fuerza */}
          {Array.isArray(r.fuerzaTests) && r.fuerzaTests.some((t: any) => t.peso) && (
            <Section title="Tests de fuerza">
              {r.fuerzaTests.filter((t: any) => t.peso).map((t: any) => {
                const rm = t.peso && t.reps ? Math.round(parseFloat(t.peso) * (1 + parseFloat(t.reps) / 30) * 10) / 10 : null;
                const pct = rm && r.peso ? Math.round(rm / r.peso * 100) : null;
                return (
                  <div key={t.ejercicio} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-600">{t.ejercicio}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-slate-400">{t.peso} kg × {t.reps}</span>
                      {rm && <span className="font-bold text-primary">{rm} kg 1RM</span>}
                      {pct && <span className="text-slate-500">{pct}%PC</span>}
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Capacidad física */}
          {r.capacidadTests && Object.values(r.capacidadTests).some(Boolean) && (
            <Section title="Capacidad física">
              {Object.entries(r.capacidadTests).filter(([, v]) => v).map(([k, v]) => (
                <KV key={k} label={k} value={v as string} />
              ))}
            </Section>
          )}

          {/* Observaciones */}
          {(r.fortalezas || r.debilidades || r.prioridades || r.restricciones || r.objetivos12sem) && (
            <Section title="Observaciones">
              <KV label="Fortalezas" value={r.fortalezas} />
              <KV label="Debilidades" value={r.debilidades} />
              <KV label="Prioridades" value={r.prioridades} />
              <KV label="Restricciones" value={r.restricciones} />
              <KV label="Objetivos 12 sem" value={r.objetivos12sem} />
              <KV label="Re-evaluación" value={r.fechaReevaluacion ? fmtFecha(r.fechaReevaluacion) : null} />
            </Section>
          )}

          {r.notas && (
            <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-500 italic">{r.notas}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FichaHistorial({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (rows.length === 0) return null;

  const filtered = rows.filter(r => {
    const matchName = !search || r.client.name.toLowerCase().includes(search.toLowerCase());
    const d = r.fecha.slice(0, 10);
    return matchName && (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-700">Historial de fichas</h2>
        <span className="text-xs text-slate-400">{filtered.length} / {rows.length}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-4 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px]">
          <input type="text" placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary" />
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-primary" />
          <span className="text-slate-300 text-xs">—</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-primary" />
          {(search || fromDate || toDate) && (
            <button onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
              className="h-8 px-2 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0
        ? <p className="text-sm text-slate-400 text-center py-6">Sin resultados para ese filtro</p>
        : <div className="space-y-2">{filtered.map(r => <RowCard key={r.id} r={{ ...r, fecha: r.fecha.toString() }} />)}</div>
      }
    </section>
  );
}