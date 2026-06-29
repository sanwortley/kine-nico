import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import PrintTrigger from './PrintTrigger';

export const dynamic = 'force-dynamic';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIA_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

function parseDate(str?: string | null): Date | null {
  if (!str) return null;
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) return new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function calcEdad(fecha?: string | null) {
  const d = parseDate(fecha);
  if (!d) return null;
  const hoy = new Date();
  let age = hoy.getFullYear() - d.getFullYear();
  if (hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function lsi(a: number | null | undefined, b: number | null | undefined) {
  if (!a || !b) return null;
  return Math.round((Math.min(a, b) / Math.max(a, b)) * 100);
}

function lsiColor(v: number) {
  if (v >= 90) return '#16a34a';
  if (v >= 75) return '#d97706';
  return '#dc2626';
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '5px 0', gap: 8 }}>
      <span style={{ color: '#64748b', fontSize: 11, minWidth: 180, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, breakInside: 'avoid' }}>
      <div style={{ background: '#0A3D62', color: 'white', padding: '5px 10px', borderRadius: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ padding: '0 4px' }}>{children}</div>
    </div>
  );
}

function LsiRow({ label, der, izq }: { label: string; der: number | null | undefined; izq: number | null | undefined }) {
  const v = lsi(der, izq);
  if (v === null && !der && !izq) return null;
  const color = v !== null ? lsiColor(v) : '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
      <span style={{ fontSize: 11, color: '#475569', minWidth: 160 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#64748b', minWidth: 80 }}>Der: {der ? `${der}N` : '—'}</span>
      <span style={{ fontSize: 11, color: '#64748b', minWidth: 80 }}>Izq: {izq ? `${izq}N` : '—'}</span>
      {v !== null && (
        <span style={{ fontSize: 12, fontWeight: 700, color, marginLeft: 'auto' }}>
          {v}% {v >= 90 ? '✓' : v >= 75 ? '⚠' : '✗'}
        </span>
      )}
    </div>
  );
}

export default async function PrintPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const { clientId } = await params;

  const [client, planilla, dinamometrias] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId }, select: { name: true, email: true } }),
    prisma.planillaAtleta.findUnique({ where: { clientId } }),
    prisma.dinamometria.findMany({ where: { clientId }, orderBy: { fecha: 'asc' } }),
  ]);

  if (!client) redirect('/professional/planillas');

  const latest = dinamometrias.at(-1);
  const edad = calcEdad(planilla?.fechaNacimiento);
  const disp = (planilla?.disponibilidad && typeof planilla.disponibilidad === 'object')
    ? planilla.disponibilidad as Record<string, { actividad: string; intensidad: string; obs: string }>
    : {};

  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <PrintTrigger />
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, Arial, sans-serif; }
        body { background: white; }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: 'white' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #0A3D62' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0A3D62' }}>Planilla del Atleta</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ficha de evaluación y perfil deportivo</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0A3D62' }}>{client.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{today}</div>
          </div>
        </div>

        {/* DATOS PERSONALES */}
        <Section title="Datos personales">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Row label="Nombre" value={client.name} />
            <Row label="Email" value={client.email} />
            <Row label="Fecha de nacimiento" value={planilla?.fechaNacimiento} />
            <Row label="Edad" value={edad ? `${edad} años` : null} />
            <Row label="Peso corporal" value={planilla?.pesoCorporal ? `${planilla.pesoCorporal} kg` : null} />
            <Row label="Largo de tibia" value={planilla?.largoTibia ? `${planilla.largoTibia} cm` : null} />
            <Row label="Lugar de residencia" value={planilla?.lugarResidencia} />
            <Row label="Diferencia horaria" value={planilla?.diferenciaHoraria} />
            <Row label="Teléfono" value={planilla?.telefono} />
          </div>
        </Section>

        {/* LESIÓN & EVOLUCIÓN */}
        <Section title="Lesión & Evolución">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Row label="Fecha Cx / lesión" value={planilla?.fechaCxLesion} />
            <Row label="Evolución (meses)" value={planilla?.evolucionMeses != null ? `${planilla.evolucionMeses} meses` : null} />
            <Row label="Fecha inicio Rh" value={planilla?.fechaInicioRh} />
            <Row label="Evolución Rh/RF" value={planilla?.evolucionRhRf} />
          </div>
          {planilla?.lesionesCx && <Row label="Lesiones / cirugías" value={planilla.lesionesCx} />}
          {planilla?.fechasLesiones && <Row label="Fechas de lesiones" value={planilla.fechasLesiones} />}
          {planilla?.antecedentes && <Row label="Antecedentes" value={planilla.antecedentes} />}
          {planilla?.comportDolor && <Row label="Comportamiento del dolor" value={planilla.comportDolor} />}
          {planilla?.estudiosComp && <Row label="Estudios complementarios" value={planilla.estudiosComp} />}
          {planilla?.trabajoProfesion && <Row label="Trabajo / profesión" value={planilla.trabajoProfesion} />}
        </Section>

        {/* OBJETIVOS */}
        <Section title="Objetivos & Expectativas">
          {planilla?.motivoConsulta && <Row label="Motivo de consulta" value={planilla.motivoConsulta} />}
          {planilla?.expectativas && <Row label="Expectativas" value={planilla.expectativas} />}
          {planilla?.objCorto && <Row label="Objetivo corto plazo (1 año)" value={planilla.objCorto} />}
          {planilla?.objMediano && <Row label="Objetivo mediano plazo (2-3 años)" value={planilla.objMediano} />}
          {planilla?.objLargo && <Row label="Objetivo largo plazo (3-5 años)" value={planilla.objLargo} />}
        </Section>

        {/* EXPERIENCIA DEPORTIVA */}
        <Section title="Experiencia Deportiva">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <Row label="Tiempo entrenando" value={planilla?.tiempoEntrenando} />
            <Row label="Veces por semana" value={planilla?.vecesXSemana} />
          </div>
          {planilla?.tipoEntrenamiento && <Row label="Tipo de entrenamiento" value={planilla.tipoEntrenamiento} />}
          {planilla?.lesionesPrevias && <Row label="Lesiones previas" value={planilla.lesionesPrevias} />}
        </Section>

        {/* DISPONIBILIDAD */}
        {DIA_KEYS.some(k => disp[k]?.actividad) && (
          <Section title="Disponibilidad para entrenar">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600, width: 80 }}>Día</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600 }}>Actividad</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600, width: 90 }}>Intensidad</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600 }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {DIA_KEYS.map((k, i) => {
                  const d = disp[k];
                  if (!d?.actividad && !d?.intensidad) return null;
                  return (
                    <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600, color: '#334155' }}>{DIAS[i]}</td>
                      <td style={{ padding: '4px 6px', color: '#475569' }}>{d.actividad || '—'}</td>
                      <td style={{ padding: '4px 6px', color: '#475569' }}>{d.intensidad || '—'}</td>
                      <td style={{ padding: '4px 6px', color: '#64748b' }}>{d.obs || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        )}

        {/* MATERIALES */}
        {(planilla?.dondeEntrenar || planilla?.elementosDisp || planilla?.tiempoDisponible) && (
          <Section title="Materiales & Lugar">
            {planilla.dondeEntrenar && <Row label="¿Dónde entrena?" value={planilla.dondeEntrenar} />}
            {planilla.elementosDisp && <Row label="Elementos disponibles" value={planilla.elementosDisp} />}
            {planilla.tiempoDisponible && <Row label="Tiempo disponible por sesión" value={planilla.tiempoDisponible} />}
          </Section>
        )}

        {/* DINAMOMETRÍA */}
        {dinamometrias.length > 0 && (
          <Section title={`Valoraciones de Fuerza Isométrica (Dinamometría) — ${dinamometrias.length} evaluación${dinamometrias.length !== 1 ? 'es' : ''}`}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
                Última evaluación: {latest ? new Date(latest.fecha).toLocaleDateString('es-AR') : '—'}
                {latest?.peso ? ` · Peso: ${latest.peso} kg` : ''}
              </div>
              <LsiRow label="Cuádriceps" der={latest?.cuadDer} izq={latest?.cuadIzq} />
              <LsiRow label="Isquiotibiales" der={latest?.isquioDer} izq={latest?.isquioIzq} />
              <LsiRow label="Abductores" der={latest?.abdDer} izq={latest?.abdIzq} />
              <LsiRow label="Aductores" der={latest?.addDer} izq={latest?.addIzq} />
              <LsiRow label="Eversores tobillo" der={latest?.eversorDer} izq={latest?.eversorIzq} />
            </div>
            {(latest?.romCaderaDer || latest?.romCaderaIzq) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>ROM</div>
                <LsiRow label="ROM Cadera flexión (cm)" der={latest?.romCaderaDer} izq={latest?.romCaderaIzq} />
                <LsiRow label="ROM Tobillo — Lunge Test (cm)" der={latest?.romTobilloDer} izq={latest?.romTobilloIzq} />
              </div>
            )}
            {latest?.velocidadSquat && (
              <Row label="Velocidad Squat 40 kg" value={`${latest.velocidadSquat} m/s`} />
            )}

            {/* Historial tabla */}
            {dinamometrias.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Historial LSI</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '3px 6px', color: '#64748b' }}>Fecha</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#64748b' }}>LSI Cuád</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#64748b' }}>LSI Isquio</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#64748b' }}>LSI Abd</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#64748b' }}>ROM Cadera</th>
                      <th style={{ textAlign: 'center', padding: '3px 6px', color: '#64748b' }}>ROM Tobillo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dinamometrias.map(d => {
                      const lc = lsi(d.cuadDer, d.cuadIzq);
                      const li = lsi(d.isquioDer, d.isquioIzq);
                      const la = lsi(d.abdDer, d.abdIzq);
                      const lrc = lsi(d.romCaderaDer, d.romCaderaIzq);
                      const lrt = lsi(d.romTobilloDer, d.romTobilloIzq);
                      return (
                        <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '3px 6px', color: '#475569' }}>{new Date(d.fecha).toLocaleDateString('es-AR')}</td>
                          {[lc, li, la, lrc, lrt].map((v, i) => (
                            <td key={i} style={{ textAlign: 'center', padding: '3px 6px', fontWeight: v !== null ? 600 : 400, color: v !== null ? lsiColor(v) : '#94a3b8' }}>
                              {v !== null ? `${v}%` : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* OBSERVACIONES */}
        {planilla?.observaciones && (
          <Section title="Observaciones generales">
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{planilla.observaciones}</p>
          </Section>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
          <span>Nicolas Jaled Kine · Planilla del Atleta</span>
          <span>Exportado el {today}</span>
        </div>

      </div>
    </>
  );
}