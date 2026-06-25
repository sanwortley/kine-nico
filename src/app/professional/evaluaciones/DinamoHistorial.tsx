'use client';

import { useState } from 'react';

interface Row {
  id: string;
  clientId: string;
  fecha: string;
  notas?: string | null;
  client: { name: string };
  peso?: number | null; altura?: number | null;
  cuadDer?: number | null; cuadIzq?: number | null;
  isquioDer?: number | null; isquioIzq?: number | null;
  abdDer?: number | null; abdIzq?: number | null;
  addDer?: number | null; addIzq?: number | null;
  eversorDer?: number | null; eversorIzq?: number | null;
  romCaderaDer?: number | null; romCaderaIzq?: number | null;
  romTobilloDer?: number | null; romTobilloIzq?: number | null;
  velocidadSquat?: number | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function pct(a?: number | null, b?: number | null) {
  if (!a || !b) return null;
  return Math.round(((Math.max(a, b) - Math.min(a, b)) / Math.max(a, b)) * 100 * 10) / 10;
}
function ratio(n?: number | null, d?: number | null) {
  if (!n || !d) return null;
  return Math.round((n / d) * 100) / 100;
}
function imc(p?: number | null, h?: number | null) {
  if (!p || !h) return null;
  return Math.round((p / (h * h)) * 10) / 10;
}
function keyMetrics(r: Row) {
  return {
    cuad:   pct(r.cuadDer,   r.cuadIzq),
    isquio: pct(r.isquioDer, r.isquioIzq),
    abd:    pct(r.abdDer,    r.abdIzq),
    vsquat: r.velocidadSquat ?? null,
    imcVal: imc(r.peso, r.altura),
  };
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function Delta({ prev, curr, lowerIsBetter = true }: {
  prev: number | null; curr: number | null; lowerIsBetter?: boolean;
}) {
  if (prev === null || curr === null) return null;
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) return null;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return (
    <span className={`text-[10px] font-bold ${improved ? 'text-green-600' : 'text-red-500'}`}>
      {improved ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

// ── Asymmetry badge ───────────────────────────────────────────────────────────
function AsBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300 text-xs">—</span>;
  const color = value < 10 ? 'bg-green-100 text-green-700' : value < 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const icon  = value < 10 ? '✓' : value < 15 ? '⚠' : '✕';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{icon} {value}%</span>;
}

// ── Detail row (expanded view) ────────────────────────────────────────────────
function DetailRow({ label, der, izq, unit = 'N', extraLabel, extraValue }: {
  label: string; der?: number | null; izq?: number | null;
  unit?: string; extraLabel?: string; extraValue?: React.ReactNode;
}) {
  const diff = pct(der, izq);
  if (!der && !izq) return null;
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-600 min-w-[140px]">{label}</span>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {der != null && <span className="text-slate-500">Der: <strong className="text-slate-800 font-mono">{der} {unit}</strong></span>}
          {izq != null && <span className="text-slate-500">Izq: <strong className="text-slate-800 font-mono">{izq} {unit}</strong></span>}
          <AsBadge value={diff} />
        </div>
      </div>
      {extraLabel && extraValue && (
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 pl-1">
          <span>{extraLabel}:</span>{extraValue}
        </div>
      )}
    </div>
  );
}

// ── Tabla de evolución ────────────────────────────────────────────────────────
function EvolutionTable({ records }: { records: Row[] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs min-w-[480px]">
        <thead>
          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <th className="text-left pb-2 pr-3">Fecha</th>
            <th className="text-center pb-2 px-2">Cuád</th>
            <th className="text-center pb-2 px-2">Isquio</th>
            <th className="text-center pb-2 px-2">Abd</th>
            <th className="text-center pb-2 px-2">IMC</th>
            <th className="text-center pb-2 px-2">VSquat</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const m  = keyMetrics(r);
            const mp = i > 0 ? keyMetrics(records[i - 1]) : null;
            return (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                <td className="py-2.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <AsBadge value={m.cuad} />
                    {mp && <Delta prev={mp.cuad} curr={m.cuad} />}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <AsBadge value={m.isquio} />
                    {mp && <Delta prev={mp.isquio} curr={m.isquio} />}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <AsBadge value={m.abd} />
                    {mp && <Delta prev={mp.abd} curr={m.abd} />}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span className={`font-bold ${m.imcVal ? (m.imcVal < 25 ? 'text-green-600' : 'text-amber-600') : 'text-slate-300'}`}>
                    {m.imcVal ?? '—'}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-bold text-slate-700">{r.velocidadSquat ?? '—'}</span>
                    {mp && <Delta prev={mp.vsquat} curr={m.vsquat} lowerIsBetter={false} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Card por paciente (vista agrupada) ────────────────────────────────────────
function PatientGroup({ name, records, onEdit }: {
  name: string;
  records: Row[]; // ordenadas oldest→newest
  onEdit: (row: Row) => void;
}) {
  const [showTable, setShowTable] = useState(false);
  const latest      = records[records.length - 1];
  const first       = records[0];
  const m           = keyMetrics(latest);
  const m0          = keyMetrics(first);
  const hasMultiple = records.length > 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{name}</p>
          <p className="text-xs text-slate-400">
            {records.length} evaluación{records.length !== 1 ? 'es' : ''} · última: {fmtFecha(latest.fecha)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasMultiple && (
            <button
              onClick={() => setShowTable(t => !t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${showTable ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              📈 Evolución
            </button>
          )}
          <button onClick={() => onEdit(latest)}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
            title="Editar última evaluación">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Métricas clave con delta vs primera evaluación */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {m.cuad !== null && (
          <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Cuád</span>
            <AsBadge value={m.cuad} />
            {hasMultiple && <Delta prev={m0.cuad} curr={m.cuad} />}
          </div>
        )}
        {m.isquio !== null && (
          <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Isquio</span>
            <AsBadge value={m.isquio} />
            {hasMultiple && <Delta prev={m0.isquio} curr={m.isquio} />}
          </div>
        )}
        {m.abd !== null && (
          <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Abd</span>
            <AsBadge value={m.abd} />
            {hasMultiple && <Delta prev={m0.abd} curr={m.abd} />}
          </div>
        )}
        {m.vsquat !== null && (
          <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">VSquat</span>
            <span className="text-xs font-bold text-slate-700">{m.vsquat} m/s</span>
            {hasMultiple && <Delta prev={m0.vsquat} curr={m.vsquat} lowerIsBetter={false} />}
          </div>
        )}
        {m.imcVal !== null && (
          <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">IMC</span>
            <span className={`text-xs font-bold ${m.imcVal < 25 ? 'text-green-600' : 'text-amber-600'}`}>{m.imcVal}</span>
          </div>
        )}
      </div>

      {/* Tabla de evolución */}
      {showTable && (
        <div className="border-t border-slate-100 px-4 pb-4">
          <EvolutionTable records={records} />
        </div>
      )}
    </div>
  );
}

// ── Card individual (vista lista) ─────────────────────────────────────────────
function RowCard({ r, prev, onEdit }: { r: Row; prev?: Row; onEdit: (row: Row) => void }) {
  const [open, setOpen] = useState(false);
  const m  = keyMetrics(r);
  const mp = prev ? keyMetrics(prev) : null;

  const summaryItems = [
    m.cuad   !== null ? `Cuád: ${m.cuad}%`         : null,
    m.isquio !== null ? `Isquio: ${m.isquio}%`     : null,
    m.abd    !== null ? `Abd: ${m.abd}%`            : null,
    m.imcVal !== null ? `IMC: ${m.imcVal}`          : null,
    r.velocidadSquat  ? `VSquat: ${r.velocidadSquat} m/s` : null,
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <button onClick={() => setOpen(o => !o)} className="flex-1 text-left flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{r.client.name}</p>
            <p className="text-xs text-slate-400">{fmtFecha(r.fecha)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              {summaryItems.map((s, i) => <span key={i}>{s}</span>)}
            </div>
            {/* Delta vs evaluación anterior del mismo paciente */}
            {mp && (
              <div className="hidden sm:flex gap-1.5 items-center">
                <Delta prev={mp.cuad} curr={m.cuad} />
                {m.vsquat !== null && <Delta prev={mp.vsquat} curr={m.vsquat} lowerIsBetter={false} />}
              </div>
            )}
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <button onClick={() => onEdit(r)}
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
          title="Editar evaluación">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {(r.peso || r.altura) && (
            <div className="flex gap-6 py-3 border-b border-slate-50 flex-wrap">
              <span className="text-xs font-semibold text-slate-600 min-w-[140px]">Datos corporales</span>
              <div className="flex gap-4 text-xs flex-wrap">
                {r.peso   && <span className="text-slate-500">Peso: <strong className="text-slate-800">{r.peso} kg</strong></span>}
                {r.altura && <span className="text-slate-500">Altura: <strong className="text-slate-800">{r.altura} m</strong></span>}
                {m.imcVal && <span className="text-slate-500">IMC: <strong className={m.imcVal < 18.5 ? 'text-blue-600' : m.imcVal < 25 ? 'text-green-600' : m.imcVal < 30 ? 'text-amber-600' : 'text-red-600'}>{m.imcVal}</strong></span>}
              </div>
            </div>
          )}
          <div className="mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Fuerza muscular</p>
            <DetailRow label="Cuádriceps" der={r.cuadDer} izq={r.cuadIzq} />
            <DetailRow label="Isquiotibiales" der={r.isquioDer} izq={r.isquioIzq}
              extraLabel="Ratio I/Q"
              extraValue={
                <span className="font-mono text-slate-600">
                  {ratio(r.isquioDer, r.cuadDer) && `Der: ${ratio(r.isquioDer, r.cuadDer)}`}
                  {ratio(r.isquioIzq, r.cuadIzq) && `  Izq: ${ratio(r.isquioIzq, r.cuadIzq)}`}
                  <span className="ml-2 text-slate-400">(óptimo 0.6–0.7)</span>
                </span>
              }
            />
            <DetailRow label="Abductores"        der={r.abdDer}     izq={r.abdIzq} />
            <DetailRow label="Adductores"        der={r.addDer}     izq={r.addIzq}
              extraLabel="Ratio Add/Abd"
              extraValue={
                <span className="font-mono text-slate-600">
                  {ratio(r.addDer, r.abdDer) && `Der: ${ratio(r.addDer, r.abdDer)}`}
                  {ratio(r.addIzq, r.abdIzq) && `  Izq: ${ratio(r.addIzq, r.abdIzq)}`}
                </span>
              }
            />
            <DetailRow label="Eversores tobillo" der={r.eversorDer} izq={r.eversorIzq} />

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 mt-1">ROM</p>
            <DetailRow label="Cadera (flex.)" der={r.romCaderaDer} izq={r.romCaderaIzq} unit="cm" />
            <DetailRow label="Tobillo"        der={r.romTobilloDer} izq={r.romTobilloIzq} unit="cm" />

            {r.velocidadSquat && (
              <div className="py-3 flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 min-w-[140px]">Velocidad squat 40kg</span>
                <span className="text-sm font-bold text-slate-700">{r.velocidadSquat} <span className="text-xs text-slate-400">m/s</span></span>
              </div>
            )}
          </div>
          {r.notas && (
            <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-500 italic">{r.notas}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────────────────────
export default function DinamoHistorial({ rows, onEdit }: { rows: Row[]; onEdit: (row: Row) => void }) {
  const [search,   setSearch]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [grouped,  setGrouped]  = useState(false);

  if (rows.length === 0) return null;

  const filtered = rows.filter(r => {
    const matchName = !search || r.client.name.toLowerCase().includes(search.toLowerCase());
    const d = r.fecha.slice(0, 10);
    return matchName && (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  });

  // Vista lista: newest first; con ref al registro previo del mismo paciente
  const allByClient = new Map<string, Row[]>();
  for (const r of [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (!allByClient.has(r.clientId)) allByClient.set(r.clientId, []);
    allByClient.get(r.clientId)!.push(r);
  }
  function prevRecord(r: Row): Row | undefined {
    const list = allByClient.get(r.clientId) ?? [];
    const idx  = list.findIndex(x => x.id === r.id);
    return idx > 0 ? list[idx - 1] : undefined;
  }
  const sortedList = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Vista agrupada: grupos por cliente, oldest→newest dentro de cada grupo
  const groupMap = new Map<string, Row[]>();
  for (const r of filtered) {
    if (!groupMap.has(r.clientId)) groupMap.set(r.clientId, []);
    groupMap.get(r.clientId)!.push(r);
  }
  for (const g of groupMap.values()) g.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const sortedGroups = [...groupMap.entries()].sort(([, a], [, b]) =>
    b[b.length - 1].fecha.localeCompare(a[a.length - 1].fecha)
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-700">Historial reciente</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{filtered.length} / {rows.length}</span>
          <button
            onClick={() => setGrouped(g => !g)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${grouped ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {grouped ? '👤 Por paciente' : '📋 Lista'}
          </button>
        </div>
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
              className="h-8 px-2 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin resultados para ese filtro</p>
      ) : grouped ? (
        <div className="space-y-3">
          {sortedGroups.map(([clientId, records]) => (
            <PatientGroup key={clientId} name={records[0].client.name} records={records} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedList.map(r => (
            <RowCard key={r.id} r={{ ...r, fecha: r.fecha.toString() }} prev={prevRecord(r)} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  );
}