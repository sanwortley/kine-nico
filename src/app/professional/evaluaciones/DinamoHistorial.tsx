'use client';

import { useState } from 'react';

interface Row {
  id: string;
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

function Badge({ value, unit = '%' }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-slate-300 text-xs">—</span>;
  if (unit === '%') {
    const color = value < 10 ? 'bg-green-100 text-green-700' : value < 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    const icon = value < 10 ? '✓' : value < 15 ? '⚠' : '✕';
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{icon} {value}%</span>;
  }
  return <span className="text-sm font-bold text-slate-700">{value} <span className="text-xs text-slate-400">{unit}</span></span>;
}

function DetailRow({ label, der, izq, unit = 'N', extraLabel, extraValue }: {
  label: string;
  der?: number | null;
  izq?: number | null;
  unit?: string;
  extraLabel?: string;
  extraValue?: React.ReactNode;
}) {
  const diff = pct(der, izq);
  if (!der && !izq) return null;
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-600 min-w-[140px]">{label}</span>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {der != null && (
            <span className="text-slate-500">Der: <strong className="text-slate-800 font-mono">{der} {unit}</strong></span>
          )}
          {izq != null && (
            <span className="text-slate-500">Izq: <strong className="text-slate-800 font-mono">{izq} {unit}</strong></span>
          )}
          <Badge value={diff} />
        </div>
      </div>
      {extraLabel && extraValue && (
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 pl-1">
          <span>{extraLabel}:</span>
          {extraValue}
        </div>
      )}
    </div>
  );
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtFecha(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function RowCard({ r }: { r: Row }) {
  const [open, setOpen] = useState(false);
  const fecha = fmtFecha(r.fecha);
  const imcVal = imc(r.peso, r.altura);

  // Resumen para la card cerrada
  const summaryItems = [
    r.cuadDer && r.cuadIzq ? `Cuád: ${pct(r.cuadDer, r.cuadIzq)}%` : null,
    r.isquioDer && r.isquioIzq ? `Isquio: ${pct(r.isquioDer, r.isquioIzq)}%` : null,
    r.abdDer && r.abdIzq ? `Abd: ${pct(r.abdDer, r.abdIzq)}%` : null,
    imcVal ? `IMC: ${imcVal}` : null,
    r.velocidadSquat ? `VSquat: ${r.velocidadSquat} m/s` : null,
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header — siempre visible, clickeable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-slate-800 text-sm">{r.client.name}</p>
          <p className="text-xs text-slate-400">{fecha}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {summaryItems.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {/* Datos corporales */}
          {(r.peso || r.altura) && (
            <div className="flex gap-6 py-3 border-b border-slate-50 flex-wrap">
              <span className="text-xs font-semibold text-slate-600 min-w-[140px]">Datos corporales</span>
              <div className="flex gap-4 text-xs flex-wrap">
                {r.peso && <span className="text-slate-500">Peso: <strong className="text-slate-800">{r.peso} kg</strong></span>}
                {r.altura && <span className="text-slate-500">Altura: <strong className="text-slate-800">{r.altura} m</strong></span>}
                {imcVal && (
                  <span className="text-slate-500">IMC: <strong className={`${imcVal < 18.5 ? 'text-blue-600' : imcVal < 25 ? 'text-green-600' : imcVal < 30 ? 'text-amber-600' : 'text-red-600'}`}>{imcVal}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Grupos musculares */}
          <div className="mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Fuerza muscular</p>
            <DetailRow label="Cuádriceps" der={r.cuadDer} izq={r.cuadIzq} />
            <DetailRow
              label="Isquiotibiales"
              der={r.isquioDer} izq={r.isquioIzq}
              extraLabel="Ratio I/Q"
              extraValue={
                <span className="font-mono text-slate-600">
                  {ratio(r.isquioDer, r.cuadDer) && `Der: ${ratio(r.isquioDer, r.cuadDer)}`}
                  {ratio(r.isquioIzq, r.cuadIzq) && `  Izq: ${ratio(r.isquioIzq, r.cuadIzq)}`}
                  <span className="ml-2 text-slate-400">(óptimo 0.6–0.7)</span>
                </span>
              }
            />
            <DetailRow label="Abductores" der={r.abdDer} izq={r.abdIzq} />
            <DetailRow
              label="Adductores"
              der={r.addDer} izq={r.addIzq}
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
            <DetailRow label="Tobillo" der={r.romTobilloDer} izq={r.romTobilloIzq} unit="cm" />

            {r.velocidadSquat && (
              <div className="py-3 flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 min-w-[140px]">Velocidad squat 40kg</span>
                <Badge value={r.velocidadSquat} unit="m/s" />
              </div>
            )}
          </div>

          {r.notas && (
            <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-500 italic">
              {r.notas}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DinamoHistorial({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (rows.length === 0) return null;

  const filtered = rows.filter(r => {
    const matchName = !search || r.client.name.toLowerCase().includes(search.toLowerCase());
    const d = r.fecha.slice(0, 10);
    const matchFrom = !fromDate || d >= fromDate;
    const matchTo = !toDate || d <= toDate;
    return matchName && matchFrom && matchTo;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-700">Historial reciente</h2>
        <span className="text-xs text-slate-400">{filtered.length} / {rows.length}</span>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-4 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[160px]">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-primary"
          />
          <span className="text-slate-300 text-xs">—</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:border-primary"
          />
          {(search || fromDate || toDate) && (
            <button
              onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
              className="h-8 px-2 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin resultados para ese filtro</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => <RowCard key={r.id} r={{ ...r, fecha: r.fecha.toString() }} />)}
        </div>
      )}
    </section>
  );
}