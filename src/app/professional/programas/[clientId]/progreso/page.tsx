import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getHistorialProgramas, getPrograma } from '@/modules/programas/actions';
import { generarInformeProgreso } from '@/lib/ai';
import type { BloqueResumen, DinamoSnapshot } from '@/lib/ai';
import PrintTrigger from '../print/PrintTrigger';

export const dynamic = 'force-dynamic';

const DAY_NAMES: Record<number, string> = {
  1: 'Lun', 2: 'Mié', 3: 'Vie', 4: 'Mar', 5: 'Jue', 6: 'Sáb', 7: 'Dom',
};

export default async function ProgresoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');
  if (session.role === 'CLIENT') redirect('/client/dashboard');

  const { clientId } = await params;

  const [client, planilla, dinamometrias, historial, activo] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { name: true } }),
    prisma.planillaAtleta.findUnique({ where: { clientId }, select: { evolucionMeses: true } }),
    prisma.dinamometria.findMany({ where: { clientId }, orderBy: { fecha: 'asc' } }),
    getHistorialProgramas(clientId),
    getPrograma(clientId),
  ]);

  if (!client) redirect('/professional/programas');

  const dinoSnapshots: DinamoSnapshot[] = dinamometrias.map(d => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-AR'),
    cuadDer: d.cuadDer, cuadIzq: d.cuadIzq,
    isquioDer: d.isquioDer, isquioIzq: d.isquioIzq,
    abdDer: d.abdDer, abdIzq: d.abdIzq,
    romTobilloDer: d.romTobilloDer, romTobilloIzq: d.romTobilloIzq,
    velocidadSquat: d.velocidadSquat,
  }));

  const todosLosBloques = [...historial, ...(activo ? [activo] : [])];

  const bloquesResumen: BloqueResumen[] = todosLosBloques.map((b: any) => {
    const diasUnicos = [...new Set(b.dias.map((d: any) => d.dia as number))];
    const ejerciciosDestacados = b.dias
      .flatMap((d: any) => d.ejercicios.map((e: any) => e.ejercicio.nombre as string))
      .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
      .slice(0, 6);
    const kgMaximo = b.dias
      .flatMap((d: any) => d.ejercicios.flatMap((e: any) => e.series.map((s: any) => s.kg as number | null)))
      .filter(Boolean)
      .reduce((max: number, v: number) => Math.max(max, v), 0) || null;

    return {
      nombre: b.nombre,
      fechaInicio: new Date(b.createdAt).toLocaleDateString('es-AR'),
      fechaCierre: b.cerradoAt
        ? new Date(b.cerradoAt).toLocaleDateString('es-AR')
        : 'En curso',
      diasPorSemana: diasUnicos.length,
      ejerciciosDestacados,
      kgMaximo,
    };
  });

  const informe = await generarInformeProgreso({
    clientName: client.name,
    evolucionMeses: planilla?.evolucionMeses,
    dinamometrias: dinoSnapshots,
    bloques: bloquesResumen,
  });

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const ultimaDino = dinamometrias.at(-1);
  const lsi = (a?: number | null, b?: number | null) =>
    a && b ? Math.round((Math.min(a, b) / Math.max(a, b)) * 100) : null;

  return (
    <>
      <PrintTrigger />
      <style>{`
        @media print {
          @page { margin: 14mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: white; color: #1e293b; font-size: 11px; }
      `}</style>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 24px' }}>

        {/* Back button — screen only */}
        <a href={`/professional/programas/${clientId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}
          className="print:hidden">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al programa
        </a>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, borderBottom: '2px solid #1e3a5f', paddingBottom: 16 }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NJK" style={{ height: 44, marginBottom: 8 }} />
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              K I N E S I O L O G Í A &nbsp;&amp;&nbsp; P E R F O R M A N C E
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f' }}>Informe de Progreso</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 2 }}>{client.name}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{today}</div>
            {planilla?.evolucionMeses && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{planilla.evolucionMeses} meses post-Cx</div>
            )}
          </div>
        </div>

        {/* LSI CARDS */}
        {ultimaDino && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
            {[
              { label: 'LSI Cuádriceps', val: lsi(ultimaDino.cuadDer, ultimaDino.cuadIzq), unit: '%' },
              { label: 'LSI Isquios', val: lsi(ultimaDino.isquioDer, ultimaDino.isquioIzq), unit: '%' },
              { label: 'LSI Abductores', val: lsi(ultimaDino.abdDer, ultimaDino.abdIzq), unit: '%' },
              { label: 'Vel. Squat', val: ultimaDino.velocidadSquat ? Math.round(ultimaDino.velocidadSquat * 100) / 100 : null, unit: ' m/s' },
            ].map(({ label, val, unit }) => (
              <div key={label} style={{ background: val && (unit === '%' ? val >= 90 : true) ? '#f0fdf4' : '#fff7ed', border: `1px solid ${val && (unit === '%' ? val >= 90 : true) ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.2, marginTop: 4 }}>
                  {val ?? '—'}{val ? unit : ''}
                </div>
                {unit === '%' && val && (
                  <div style={{ fontSize: 9, color: val >= 90 ? '#16a34a' : '#ea580c', fontWeight: 700, marginTop: 2 }}>
                    {val >= 90 ? '✓ Criterio OK' : `Déficit ${90 - val}%`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RESUMEN IA */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#64748b', marginBottom: 8 }}>Resumen clínico</div>
          <p style={{ lineHeight: 1.7, color: '#334155', fontSize: 11 }}>{informe.resumen}</p>
        </div>

        {/* LOGROS + ALERTAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#16a34a', marginBottom: 8 }}>Logros alcanzados</div>
            {informe.logros.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#15803d', lineHeight: 1.5 }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#ea580c', marginBottom: 8 }}>Alertas / déficits</div>
            {informe.alertas.length === 0
              ? <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin alertas registradas.</p>
              : informe.alertas.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: '#ea580c', fontWeight: 700, flexShrink: 0 }}>⚠</span>
                  <span style={{ color: '#9a3412', lineHeight: 1.5 }}>{a}</span>
                </div>
              ))}
          </div>
        </div>

        {/* RECOMENDACIONES */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', marginBottom: 22 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#2563eb', marginBottom: 8 }}>Recomendaciones próximo bloque</div>
          {informe.recomendaciones.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0 }}>→</span>
              <span style={{ color: '#1e40af', lineHeight: 1.5 }}>{r}</span>
            </div>
          ))}
        </div>

        {/* EVOLUCIÓN DINAMOMETRÍA */}
        {dinamometrias.length > 1 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#64748b', marginBottom: 10 }}>Evolución dinamometría</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                  {['Fecha', 'LSI Cuád %', 'LSI Isquio %', 'LSI Abd %', 'ROM Tobillo D/I', 'Vel. Squat'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dinamometrias.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{new Date(d.fecha).toLocaleDateString('es-AR')}</td>
                    <td style={{ padding: '5px 8px' }}>{lsi(d.cuadDer, d.cuadIzq) ?? '—'}</td>
                    <td style={{ padding: '5px 8px', fontWeight: lsi(d.isquioDer, d.isquioIzq) !== null && lsi(d.isquioDer, d.isquioIzq)! >= 90 ? 700 : 400, color: lsi(d.isquioDer, d.isquioIzq) !== null && lsi(d.isquioDer, d.isquioIzq)! >= 90 ? '#16a34a' : 'inherit' }}>
                      {lsi(d.isquioDer, d.isquioIzq) ?? '—'}
                    </td>
                    <td style={{ padding: '5px 8px' }}>{lsi(d.abdDer, d.abdIzq) ?? '—'}</td>
                    <td style={{ padding: '5px 8px' }}>{d.romTobilloDer ?? '—'} / {d.romTobilloIzq ?? '—'} cm</td>
                    <td style={{ padding: '5px 8px' }}>{d.velocidadSquat ? `${d.velocidadSquat} m/s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* HISTORIAL DE BLOQUES */}
        {bloquesResumen.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#64748b', marginBottom: 10 }}>Bloques de entrenamiento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bloquesResumen.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ width: 28, height: 28, background: '#1e3a5f', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{b.nombre}</div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                      {b.fechaInicio} → {b.fechaCierre} · {b.diasPorSemana} días/sem
                      {b.kgMaximo ? ` · Kg máx: ${b.kgMaximo}` : ''}
                    </div>
                    {b.ejerciciosDestacados.length > 0 && (
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{b.ejerciciosDestacados.join(' · ')}</div>
                    )}
                  </div>
                  {b.fechaCierre === 'En curso' && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 20 }}>Activo</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 9 }}>
          <span>Entrenar con ciencia, recuperar con conciencia · NJK</span>
          <span>Generado con IA · {today}</span>
        </div>
      </div>
    </>
  );
}