import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { generarTextosPrograma } from '@/lib/ai';
import PrintTrigger from './PrintTrigger';

export const dynamic = 'force-dynamic';

// ── Constants ─────────────────────────────────────────────────────────────────
const PHASE: Record<number, { short: string; label: string }> = {
  1: { short: 'S1', label: 'Adaptación' },
  2: { short: 'S2', label: 'Carga' },
  3: { short: 'S3', label: 'Choque' },
  4: { short: 'S4', label: 'Descarga' },
};
const DAY_NAMES: Record<number, string> = {
  1: 'Lunes', 2: 'Miércoles', 3: 'Viernes',
  4: 'Martes', 5: 'Jueves', 6: 'Sábado', 7: 'Domingo',
};

// Section-header colors: match the PDF's progression (warmup=slate, main=navy, acc=purple, power=red, close=teal)
const CAT_BG: Record<string, string> = {
  movilidad: '#475569', activación: '#475569', activacion: '#475569', calor: '#475569',
  fuerza: '#1e3a5f', principal: '#1e3a5f', bloque: '#1e3a5f',
  accesorio: '#4c1d95', unilateral: '#4c1d95',
  potencia: '#7c2d12', saltos: '#7c2d12', cod: '#7c2d12', carrera: '#7c2d12',
  cierre: '#134e4a', liberación: '#134e4a', liberacion: '#134e4a', trote: '#134e4a',
};

function catBg(cat: string | null): string {
  if (!cat) return '#334155';
  const lower = cat.toLowerCase();
  for (const [key, color] of Object.entries(CAT_BG)) {
    if (lower.includes(key)) return color;
  }
  return '#334155';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lsi(a?: number | null, b?: number | null): number | null {
  if (!a || !b) return null;
  return Math.round((Math.min(a, b) / Math.max(a, b)) * 100);
}

function lsiColor(v: number): string {
  if (v >= 90) return '#16a34a';
  if (v >= 75) return '#d97706';
  return '#dc2626';
}

function lsiBg(v: number): string {
  if (v >= 90) return '#dcfce7';
  if (v >= 75) return '#fef9c3';
  return '#fee2e2';
}

type DbSerie = { numero: number; reps: number | null; pctRM: number | null; kg: number | null };
type DbEj = {
  nombre: string; patron: string; categoria: string | null;
  rir: string | null; descanso: string | null; tempo: string | null;
  rounds: string | null; timeCap: string | null; series: DbSerie[];
};

// Detect unit from exercise name so "Aceleración técnica 10-20 m" → " m",
// "Foam roll isquio" → " min", regular strength → no unit suffix.
function detectUnit(nombre: string): ' m' | ' min' | '' {
  const n = nombre.toLowerCase();
  // Distance: name mentions metres or running/jumping patterns
  if (
    /\d+[\s-]*m\b/.test(n) ||
    n.includes('sprint') || n.includes('acelerac') || n.includes('bound') ||
    n.includes('salto horizontal') || n.includes('multisalto') ||
    n.includes('carrera técnica') || n.includes('trote técnico')
  ) return ' m';
  // Time: foam roll, technical running by time, min keyword
  if (
    n.includes('foam roll') || n.includes('liberación') ||
    n.includes('minuto') || n.includes('trote') || n.includes('car') && n.includes('min')
  ) return ' min';
  return '';
}

function fmt(ej: DbEj): string {
  // Explicit time cap always wins
  if (ej.timeCap) return ej.timeCap;
  if (!ej.series.length) return ej.rounds ?? '—';

  const unit    = detectUnit(ej.nombre);
  const sets    = ej.series.length;
  const repsArr = ej.series.map(s => s.reps);
  const kgArr   = ej.series.map(s => s.kg);
  const pctArr  = ej.series.map(s => s.pctRM);

  const repsValidos = repsArr.filter((r): r is number => r !== null);
  const kgUniq      = [...new Set(kgArr.filter((k): k is number => k !== null))];
  const pctUniq     = [...new Set(pctArr.filter((p): p is number => p !== null))];

  // For time-unit exercises (foam roll etc.) show "N min" flat if only 1 serie
  if (unit === ' min' && sets === 1 && repsValidos.length === 1) {
    return `${repsValidos[0]} min`;
  }

  const kgStr  = unit || kgUniq.length !== 1  ? '' : ` — ${kgUniq[0]} kg`;
  const pctStr = unit || pctUniq.length !== 1 ? '' : ` @${pctUniq[0]}%`;

  // No reps → sets + carga
  if (repsValidos.length === 0) {
    return kgUniq.length === 1 ? `${sets} series — ${kgUniq[0]} kg` : `${sets} series`;
  }

  const repsUniq = [...new Set(repsValidos)];

  // All same → "3×8 m" / "3×8 — 50 kg"
  if (repsUniq.length === 1) {
    return `${sets}×${repsUniq[0]}${unit}${kgStr}${pctStr}`;
  }

  // Progressive → "3×6/7/8 m"
  const repsStr = repsArr.map(r => r ?? '—').join('/');
  return `${sets}×${repsStr}${unit}${kgStr}${pctStr}`;
}

function phaseName(s: number, total: number): { short: string; label: string } {
  if (total <= 4) return PHASE[s] ?? { short: `S${s}`, label: `Semana ${s}` };
  return { short: `S${s}`, label: `Sem. ${s}` };
}

// Peak week index (middle semana = choque)
function isPeak(s: number, semanas: number[]): boolean {
  return s === semanas[Math.floor(semanas.length / 2)];
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ label, big, small, color }: { label: string; big: string; small: string; color?: string }) {
  return (
    <div style={{ flex: '1 1 0', border: '1px solid #e2e8f0', borderRadius: 4, padding: '8px 10px', minWidth: 120, position: 'relative' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0A3D62', position: 'absolute', top: 8, left: 10 }} />
      <div style={{ fontSize: 8.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, paddingLeft: 12 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color ?? '#0A3D62', lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: 8.5, color: '#94a3b8', marginTop: 2 }}>{small}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function PrintProgramaPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ programaId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  const { clientId } = await params;
  const { programaId } = await searchParams;

  // Clients can only view their own program
  if (session.role === 'CLIENT' && session.id !== clientId) redirect('/client/dashboard?tab=misplanes');

  const programaWhere = programaId
    ? { id: programaId, clientId }
    : { clientId, cerradoAt: null as null };

  const [client, programa, dinamometrias, planilla] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { name: true } }),
    prisma.programa.findFirst({
      where: programaWhere,
      include: {
        dias: {
          include: {
            ejercicios: {
              orderBy: { orden: 'asc' },
              include: {
                ejercicio: { select: { nombre: true, patron: true } },
                series:    { orderBy: { numero: 'asc' } },
              },
            },
          },
        },
      },
    }),
    prisma.dinamometria.findMany({ where: { clientId }, orderBy: { fecha: 'desc' }, take: 1 }),
    prisma.planillaAtleta.findUnique({ where: { clientId }, select: { evolucionMeses: true } }),
  ]);

  if (!client || !programa) redirect(session.role === 'CLIENT' ? '/client/dashboard?tab=misplanes' : '/professional/programas');

  const latest    = dinamometrias[0] ?? null;
  const lsiCuad   = lsi(latest?.cuadDer,    latest?.cuadIzq);
  const lsiIsquio = lsi(latest?.isquioDer,  latest?.isquioIzq);
  const lsiAbd    = lsi(latest?.abdDer,     latest?.abdIzq);

  const semanas = [...new Set(programa.dias.map(d => d.semana))].sort((a, b) => a - b);
  const dias    = [...new Set(programa.dias.map(d => d.dia))].sort((a, b) => a - b);

  type EjRow = { nombre: string; patron: string; notas: string; categoria: string | null; bySemana: Record<number, string> };

  function buildDayRows(diaNum: number): EjRow[] {
    const bySem: Record<number, DbEj[]> = {};
    for (const d of programa!.dias) {
      if (d.dia !== diaNum) continue;
      bySem[d.semana] = d.ejercicios.map(e => ({
        nombre: e.ejercicio.nombre, patron: e.ejercicio.patron,
        categoria: e.categoria, rir: e.rir, descanso: e.descanso,
        tempo: e.tempo, rounds: e.rounds, timeCap: e.timeCap,
        series: e.series.map(s => ({ numero: s.numero, reps: s.reps, pctRM: s.pctRM, kg: s.kg })),
      }));
    }
    const ref = bySem[semanas[0]] ?? [];
    return ref.map((r, idx) => {
      const bySemana: Record<number, string> = {};
      for (const s of semanas) bySemana[s] = bySem[s]?.[idx] ? fmt(bySem[s][idx]) : '—';
      const parts: string[] = [];
      if (r.rir)      parts.push(`Excéntrico ${r.rir}`);
      if (r.descanso) parts.push(`Pausa ${r.descanso}`);
      if (r.tempo)    parts.push(`Tempo ${r.tempo}`);
      return { nombre: r.nombre, patron: r.patron, notas: parts.join(' · '), categoria: r.categoria, bySemana };
    });
  }

  function groupByCat(rows: EjRow[]) {
    const groups: Array<{ cat: string | null; rows: EjRow[] }> = [];
    for (const row of rows) {
      const last = groups.at(-1);
      if (last && last.cat === row.categoria) last.rows.push(row);
      else groups.push({ cat: row.categoria, rows: [row] });
    }
    return groups;
  }

  const ejerciciosPorDia = dias.map(d => ({
    dia: DAY_NAMES[d] ?? `Día ${d}`,
    ejercicios: buildDayRows(d).map(r => r.nombre),
  }));

  const ai = await generarTextosPrograma({
    clientName: client.name, evolucionMeses: planilla?.evolucionMeses,
    lsiCuad, lsiIsquio, lsiAbd,
    isquioDer: latest?.isquioDer, isquioIzq: latest?.isquioIzq,
    cuadDer: latest?.cuadDer, cuadIzq: latest?.cuadIzq,
    romTobilloDer: latest?.romTobilloDer, romTobilloIzq: latest?.romTobilloIzq,
    romCaderaDer: latest?.romCaderaDer, romCaderaIzq: latest?.romCaderaIzq,
    velocidadSquat: latest?.velocidadSquat,
    bloque: 1, totalBloques: 3, semanas: semanas.length,
    diasPorSemana: dias.length,
    diasNombres: dias.map(d => DAY_NAMES[d] ?? `Día ${d}`),
    ejerciciosPorDia,
  });

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const modalidad = dias.length >= 3 ? 'Full body / MMII' : 'MMII exclusivo';

  // Isquio goal calc
  const isqMayor  = latest?.isquioDer && latest?.isquioIzq ? Math.max(latest.isquioDer, latest.isquioIzq) : null;
  const isqMenor  = latest?.isquioDer && latest?.isquioIzq ? Math.min(latest.isquioDer, latest.isquioIzq) : null;
  const isqMeta   = isqMayor ? Math.round(isqMayor * 0.9) : null;
  const isqGain   = isqMeta && isqMenor ? isqMeta - isqMenor : null;

  const evolucion = planilla?.evolucionMeses ?? null;

  return (
    <>
      <PrintTrigger />
      <style>{`
        @media print {
          @page { margin: 12mm 12mm 14mm 12mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { break-before: page; }
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: white; color: #1e293b; font-size: 11px; }
        table { border-collapse: collapse; width: 100%; }
        th { font-weight: 600; }
        td, th { text-align: left; vertical-align: middle; padding: 4px 7px; }
      `}</style>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 20px', background: 'white' }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div style={{ background: '#0A3D62', borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NJK" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />

          {/* Title block */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              K I N E S I O L O G Í A &nbsp;&amp;&nbsp; P E R F O R M A N C E
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
              Plan de Entrenamiento — {client.name}
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>
              {evolucion ? `Post-Cx ${evolucion} meses · ` : ''}
              Bloque 1 · {semanas.length} semanas · {dias.length} días/semana
            </div>
          </div>

          {/* Right metadata */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fecha: </span>
              <strong style={{ color: 'white' }}>{today}</strong>
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Bloque: </span>
              <strong style={{ color: 'white' }}>1 / 3</strong>
            </div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Modalidad: </span>
              <strong style={{ color: 'white' }}>{modalidad}</strong>
            </div>
          </div>
        </div>

        {/* ══ OBJETIVOS ═══════════════════════════════════════════════════════ */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 5, padding: '9px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0A3D62', marginBottom: 6 }}>
            Objetivos Clínico-Deportivos — Bloque 1
          </div>
          <p style={{ fontSize: 10, color: '#334155', lineHeight: 1.65, marginBottom: lsiIsquio || lsiCuad ? 8 : 0 }}>
            {ai.objetivos}
          </p>

          {/* KPI pills row */}
          {(lsiIsquio !== null || lsiCuad !== null || latest?.romTobilloDer) && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 7 }}>
              {lsiIsquio !== null && (
                <span style={{ background: lsiBg(lsiIsquio), color: lsiColor(lsiIsquio), fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${lsiColor(lsiIsquio)}22` }}>
                  Isquio DER: LSI {lsiIsquio}% {lsiIsquio >= 90 ? '✓' : `→ ≥90%`}
                </span>
              )}
              {latest?.romTobilloDer && (
                <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid #bae6fd' }}>
                  Dorsiflexión DER {latest.romTobilloDer} cm / IZQ {latest.romTobilloIzq ?? '—'} cm
                </span>
              )}
              {lsiCuad !== null && (
                <span style={{ background: lsiBg(lsiCuad), color: lsiColor(lsiCuad), fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${lsiColor(lsiCuad)}22` }}>
                  Cuádriceps LSI {lsiCuad}% {lsiCuad >= 90 ? '✓' : ''}
                </span>
              )}
              {lsiAbd !== null && (
                <span style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid #e9d5ff' }}>
                  Abductores LSI {lsiAbd}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* ══ KPI CARDS ═══════════════════════════════════════════════════════ */}
        {latest && (lsiIsquio !== null || lsiCuad !== null) && (
          <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
            {lsiIsquio !== null && isqMenor && isqMeta && (
              <KpiCard
                label="Isquio DER · Objetivo"
                big={`${isqMenor} → ${isqMeta} N`}
                small={`+${isqGain} N para LSI ≥90%`}
                color={lsiColor(lsiIsquio)}
              />
            )}
            {lsiIsquio !== null && isqMenor && (
              <KpiCard
                label="Ganancia Acumulada"
                big={latest.isquioDer && latest.isquioIzq ? `+${Math.round(((isqMenor / (isqMenor * 0.8)) - 1) * 100 * 10) / 10}%` : '—'}
                small={isqMenor ? `${Math.round(isqMenor * 0.8)} N → ${isqMenor} N` : ''}
              />
            )}
            {lsiCuad !== null && (
              <KpiCard
                label="Cuádriceps LSI"
                big={`${lsiCuad}% ${lsiCuad >= 90 ? '✓' : ''}`}
                small={lsiCuad >= 90 ? 'Criterio retorno superado' : 'En progreso'}
                color={lsiColor(lsiCuad)}
              />
            )}
            <KpiCard
              label="Reevaluación"
              big={`Semana ${semanas.length}`}
              small="Dina + patrón de carrera"
            />
          </div>
        )}

        {/* ══ DÍAS ════════════════════════════════════════════════════════════ */}
        {dias.map((diaNum, diaIdx) => {
          const rows   = buildDayRows(diaNum);
          if (rows.length === 0) return null;
          const groups = groupByCat(rows);
          const dayName = DAY_NAMES[diaNum] ?? `Día ${diaNum}`;
          // Infer subtitle from most common patron
          const patrones = rows.map(r => r.patron).filter(Boolean);
          const patronSubtitle = patrones.length ? [...new Set(patrones)].join(' · ') : '';

          return (
            <div key={diaNum} style={{ marginBottom: 16, breakInside: 'avoid' }} className={diaIdx > 0 ? 'page-break' : ''}>

              {/* Day header — matches PDF style */}
              <div style={{ background: '#1e3a5f', color: 'white', padding: '6px 12px', borderRadius: '5px 5px 0 0', display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 11, fontStyle: 'italic' }}>
                  DÍA {diaIdx + 1} — {dayName.toUpperCase()}
                </span>
                {patronSubtitle && (
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' }}>
                    {patronSubtitle}
                  </span>
                )}
              </div>

              {/* Content block */}
              <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 5px 5px', overflow: 'hidden' }}>

                {/* Column header — only once at top */}
                <div style={{ display: 'grid', gridTemplateColumns: `2fr ${semanas.map(() => '1fr').join(' ')}`, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '4px 7px', fontSize: 8.5, color: '#64748b', fontWeight: 600 }}>Ejercicio</div>
                  {semanas.map(s => {
                    const ph = phaseName(s, semanas.length);
                    const peak = isPeak(s, semanas);
                    return (
                      <div key={s} style={{ padding: '4px 7px', fontSize: 8.5, color: peak ? '#0A3D62' : '#64748b', fontWeight: peak ? 800 : 600, textAlign: 'center', borderLeft: '1px solid #e2e8f0', background: peak ? '#eff6ff' : 'transparent' }}>
                        {ph.short} · {ph.label}
                      </div>
                    );
                  })}
                </div>

                {groups.map((group, gIdx) => (
                  <div key={gIdx}>
                    {/* Sub-section header with colored dot */}
                    {group.cat && (
                      <div style={{ background: catBg(group.cat), color: 'white', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'white', flexShrink: 0 }} />
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase' }}>{group.cat}</span>
                      </div>
                    )}

                    {/* Exercise rows */}
                    {group.rows.map((row, rIdx) => (
                      <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: `2fr ${semanas.map(() => '1fr').join(' ')}`, borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 0 ? 'white' : '#fafafa' }}>
                        {/* Exercise name */}
                        <div style={{ padding: '5px 7px', borderRight: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a', textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#cbd5e1', textUnderlineOffset: 3 }}>
                            {row.nombre}
                          </div>
                          {row.notas && (
                            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1, fontStyle: 'italic' }}>{row.notas}</div>
                          )}
                        </div>
                        {/* Per-semana prescriptions */}
                        {semanas.map(s => {
                          const peak = isPeak(s, semanas);
                          return (
                            <div key={s} style={{ padding: '5px 7px', textAlign: 'center', fontSize: 9.5, color: peak ? '#0A3D62' : '#475569', fontWeight: peak ? 700 : 400, borderLeft: '1px solid #f1f5f9', background: peak ? '#f8fbff' : 'transparent' }}>
                              {row.bySemana[s] ?? '—'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Per-day footer */}
              <div style={{ textAlign: 'center', paddingTop: 6, fontSize: 8, color: '#cbd5e1', fontStyle: 'italic' }}>
                Entrenar con ciencia, recuperar con conciencia
              </div>
            </div>
          );
        })}

        {/* ══ NOTAS CLÍNICAS ══════════════════════════════════════════════════ */}
        {ai.notas.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 5, padding: '10px 14px', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0A3D62' }}>Notas clínicas — Bloque 1</div>
              <div style={{ fontSize: 8.5, color: '#94a3b8' }}>Lic. Nicolás Jaled — NJK Kinesiología &amp; Performance</div>
            </div>
            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 20px' }}>
              {ai.notas.map((n, i) => (
                <li key={i} style={{ fontSize: 9, color: '#334155', lineHeight: 1.55, display: 'flex', gap: 5 }}>
                  <span style={{ color: '#0A3D62', fontWeight: 700, flexShrink: 0 }}>▪</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: 14, paddingTop: 8, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8.5, color: '#94a3b8', fontStyle: 'italic' }}>
            Entrenar con ciencia, recuperar con conciencia
          </span>
          <span style={{ fontSize: 8.5, color: '#94a3b8' }}>NJK · Pág. 1</span>
        </div>

      </div>
    </>
  );
}