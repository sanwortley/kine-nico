import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface ProgramaAIInput {
  clientName: string;
  evolucionMeses?: number | null;
  lsiCuad?: number | null;
  lsiIsquio?: number | null;
  lsiAbd?: number | null;
  isquioDer?: number | null;
  isquioIzq?: number | null;
  cuadDer?: number | null;
  cuadIzq?: number | null;
  romTobilloDer?: number | null;
  romTobilloIzq?: number | null;
  romCaderaDer?: number | null;
  romCaderaIzq?: number | null;
  velocidadSquat?: number | null;
  bloque: number;
  totalBloques: number;
  semanas: number;
  diasPorSemana: number;
  diasNombres: string[]; // ej. ["Lunes", "Miércoles", "Viernes"]
  ejerciciosPorDia: Array<{ dia: string; ejercicios: string[] }>;
}

export interface ProgramaAIOutput {
  objetivos: string;
  notas: string[];
  lsiTag?: string;
}

function lsi(a?: number | null, b?: number | null): number | null {
  if (!a || !b) return null;
  return Math.round((Math.min(a, b) / Math.max(a, b)) * 100);
}

function buildFallback(input: ProgramaAIInput): ProgramaAIOutput {
  const lc = lsi(input.cuadDer, input.cuadIzq);
  const li = lsi(input.isquioDer, input.isquioIzq);
  const notas: string[] = [];

  if (li !== null && li < 90) {
    const meta = input.isquioDer && input.isquioIzq
      ? Math.round(Math.max(input.isquioDer, input.isquioIzq) * 0.9)
      : null;
    notas.push(`Isquiotibiales LSI ${li}% — objetivo ≥90%${meta ? ` (${Math.min(input.isquioDer ?? 0, input.isquioIzq ?? 0)} N → ${meta} N)` : ''}.`);
  }
  if (input.romTobilloDer || input.romTobilloIzq) {
    notas.push(`Dorsiflexión de tobillo: DER ${input.romTobilloDer ?? '—'} cm / IZQ ${input.romTobilloIzq ?? '—'} cm. Integrar en el calentamiento de cada sesión.`);
  }
  if (lc !== null && lc >= 90) {
    notas.push(`Cuádriceps LSI ${lc}% — criterio de retorno superado. Mantener carga.`);
  }
  notas.push(`Rango de sentadilla limitado a 0-90° hasta indicación contraria.`);
  notas.push(`Reevaluación al cierre del bloque: dinamometría + observación de patrón.`);

  const meses = input.evolucionMeses ?? '—';
  const objetivos = `El objetivo central del Bloque ${input.bloque} es cerrar el déficit de fuerza isométrica en isquiotibiales${li ? ` (LSI actual ${li}%)` : ''} y consolidar la carga de entrenamiento en el patrón de cadena posterior.${lc !== null && lc >= 90 ? ` El cuádriceps ya superó el criterio de retorno (LSI ${lc}%), lo que permite centrar el estímulo en la pierna más débil.` : ''} A ${meses} meses de evolución, el programa integra fuerza unilateral, patrón de carrera y gestos reactivos para preparar el retorno deportivo progresivo.`;

  return { objetivos, notas };
}

export async function generarTextosPrograma(input: ProgramaAIInput): Promise<ProgramaAIOutput> {
  const client = getClient();
  if (!client) return buildFallback(input);

  const li = lsi(input.isquioDer, input.isquioIzq);
  const lc = lsi(input.cuadDer, input.cuadIzq);
  const isqMenor = input.isquioDer && input.isquioIzq
    ? Math.min(input.isquioDer, input.isquioIzq)
    : null;
  const isqMeta = isqMenor ? Math.round(Math.max(input.isquioDer ?? 0, input.isquioIzq ?? 0) * 0.9) : null;

  const prompt = `Sos kinesiólogo deportivo argentino especializado en rehabilitación post-LCA. Generá los textos para un plan de entrenamiento en tono profesional y clínico, en español rioplatense.

DATOS DEL ATLETA:
- Nombre: ${input.clientName}
- Evolución post-Cx: ${input.evolucionMeses ?? '—'} meses
- LSI Cuádriceps: ${lc ?? '—'}%${lc && lc >= 90 ? ' ✓ criterio superado' : ''}
- LSI Isquiotibiales: ${li ?? '—'}%${li ? ` (${isqMenor} N → meta ≥${isqMeta} N para LSI ≥90%)` : ''}
- ROM Tobillo DER: ${input.romTobilloDer ?? '—'} cm | IZQ: ${input.romTobilloIzq ?? '—'} cm
- ROM Cadera DER: ${input.romCaderaDer ?? '—'} cm | IZQ: ${input.romCaderaIzq ?? '—'} cm
${input.velocidadSquat ? `- Velocidad Squat 40 kg: ${input.velocidadSquat} m/s` : ''}

ESTRUCTURA DEL PLAN:
- Bloque: ${input.bloque} de ${input.totalBloques}
- Semanas: ${input.semanas} (${input.semanas === 4 ? 'Adaptación → Carga → Choque → Descarga' : 'progresión lineal'})
- Días/semana: ${input.diasPorSemana} (${input.diasNombres.join(', ')})

EJERCICIOS CLAVE POR DÍA:
${input.ejerciciosPorDia.map(d => `- ${d.dia}: ${d.ejercicios.slice(0, 5).join(', ')}`).join('\n')}

Respondé ÚNICAMENTE con JSON válido, sin markdown, con esta estructura exacta:
{
  "objetivos": "3-4 oraciones describiendo los objetivos clínico-deportivos del bloque, mencionando métricas específicas",
  "notas": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5", "bullet 6"]
}

Las notas deben ser clínicas, concretas y accionables (qué hacer, no hacer, monitorear). Máximo 6 bullets.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const parsed = JSON.parse(text) as ProgramaAIOutput;
    return parsed;
  } catch {
    return buildFallback(input);
  }
}