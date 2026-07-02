import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'ver_paciente',
    description: 'Obtiene datos clínicos completos de un paciente: ficha de evaluación, dinamometrías recientes, programas anteriores',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'ID del paciente' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'crear_programa',
    description: 'Crea el programa de entrenamiento completo en la plataforma. Siempre creá 4 semanas con progresión de cargas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        nombre: { type: 'string', description: 'Nombre del bloque ej: "Bloque 2 — Movilidad y Fuerza"' },
        objetivo: { type: 'string', description: 'Objetivo clínico en 1 frase' },
        tags: { type: 'array', items: { type: 'string' } },
        dias: {
          type: 'array',
          description: 'Todos los días del programa (semana 1 a 4, todos los días de entrenamiento)',
          items: {
            type: 'object',
            properties: {
              semana: { type: 'number', description: '1 a 4' },
              dia: { type: 'number', description: '1=Lunes 2=Martes 3=Miércoles 4=Jueves 5=Viernes 6=Sábado 7=Domingo' },
              ejercicios: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ejercicioId: { type: 'string', description: 'ID exacto del ejercicio de la lista provista' },
                    categoria: { type: 'string', description: 'ej: Movilidad, Fuerza, Accesorio' },
                    rir: { type: 'string', description: 'ej: 2, 1, 0' },
                    descanso: { type: 'string', description: 'ej: 90s, 2min' },
                    series: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          numero: { type: 'number' },
                          reps: { type: 'number' },
                          kg: { type: 'number' },
                        },
                        required: ['numero', 'reps'],
                      },
                    },
                  },
                  required: ['ejercicioId', 'series'],
                },
              },
            },
            required: ['semana', 'dia', 'ejercicios'],
          },
        },
      },
      required: ['clientId', 'nombre', 'objetivo', 'dias'],
    },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'ver_paciente': {
        const { clientId } = input;
        const [ficha, dinamometrias, programas] = await Promise.all([
          prisma.fichaEvaluacion.findFirst({ where: { clientId }, orderBy: { fecha: 'desc' } }),
          prisma.dinamometria.findMany({ where: { clientId }, orderBy: { fecha: 'desc' }, take: 2 }),
          prisma.programa.findMany({
            where: { clientId, cerradoAt: { not: null } },
            orderBy: { cerradoAt: 'desc' },
            take: 2,
            include: {
              dias: {
                include: {
                  ejercicios: {
                    include: { ejercicio: { select: { nombre: true, patron: true } } },
                    orderBy: { orden: 'asc' },
                  },
                },
              },
            },
          }),
        ]);
        return JSON.stringify({ ficha, dinamometrias, programasAnteriores: programas });
      }

      case 'crear_programa': {
        const { clientId, nombre, objetivo, tags = [], dias } = input;

        // Validate all ejercicioIds exist before creating
        const ids = [...new Set<string>(dias.flatMap((d: any) => d.ejercicios.map((e: any) => String(e.ejercicioId))))];
        const found = await prisma.ejercicio.findMany({ where: { id: { in: ids } }, select: { id: true } });
        const foundIds = new Set(found.map(e => e.id));
        const missing = ids.filter(id => !foundIds.has(id));
        if (missing.length > 0) {
          return JSON.stringify({ success: false, error: `Ejercicios no encontrados: ${missing.join(', ')}. Usá únicamente IDs de la lista provista.` });
        }

        // Close existing open program
        const activo = await prisma.programa.findFirst({ where: { clientId, cerradoAt: null } });
        if (activo) {
          await prisma.programa.update({ where: { id: activo.id }, data: { cerradoAt: new Date() } });
        }

        const programa = await prisma.programa.create({ data: { clientId, nombre } });

        for (const diaData of dias) {
          const diaRecord = await prisma.programaDia.create({
            data: { programaId: programa.id, semana: diaData.semana, dia: diaData.dia },
          });
          for (let i = 0; i < diaData.ejercicios.length; i++) {
            const ej = diaData.ejercicios[i];
            const ejRecord = await prisma.programaEjercicio.create({
              data: {
                diaId: diaRecord.id,
                ejercicioId: ej.ejercicioId,
                orden: i + 1,
                categoria: ej.categoria ?? '',
                rir: ej.rir ?? '',
                descanso: ej.descanso ?? '90s',
              },
            });
            for (const serie of ej.series) {
              await prisma.programaSerie.create({
                data: {
                  programaEjercicioId: ejRecord.id,
                  numero: serie.numero,
                  reps: serie.reps ?? null,
                  kg: serie.kg ?? null,
                },
              });
            }
          }
        }

        // Save to AI memory
        const diasUnicos = new Set(dias.map((d: any) => d.dia)).size;
        await (prisma as any).aiPlanMemoria.create({
          data: {
            clientId,
            objetivo,
            tags,
            diasSemana: diasUnicos,
            semanas: Math.max(...dias.map((d: any) => d.semana)),
            planJson: dias,
            prompt: nombre,
          },
        });

        return JSON.stringify({
          success: true,
          programaId: programa.id,
          url: `/professional/programas/${clientId}`,
          mensaje: `Programa "${nombre}" creado: ${diasUnicos} días/semana × ${Math.max(...dias.map((d: any) => d.semana))} semanas.`,
        });
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

// ── API Route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role === 'CLIENT') {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

  // Pre-load context: patients + all exercises grouped by patron
  const [clientes, ejercicios] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CLIENT', status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.ejercicio.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, patron: true },
      orderBy: [{ patron: 'asc' }, { nombre: 'asc' }],
    }),
  ]);

  // Group exercises by patron
  const grouped: Record<string, { id: string; nombre: string }[]> = {};
  for (const e of ejercicios) {
    if (!grouped[e.patron]) grouped[e.patron] = [];
    grouped[e.patron].push({ id: e.id, nombre: e.nombre });
  }

  const system = `Sos un asistente de kinesiología y entrenamiento deportivo para Nicolás Jaled Kine.
Tu tarea es crear planes de entrenamiento completos y efectivos para sus pacientes.

PACIENTES DISPONIBLES:
${clientes.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

EJERCICIOS DISPONIBLES (usá estos IDs exactos en crear_programa):
${Object.entries(grouped).map(([patron, ejs]) =>
    `\n### ${patron}\n${ejs.map(e => `  ${e.nombre} → ID: ${e.id}`).join('\n')}`
  ).join('\n')}

INSTRUCCIONES:
- Si necesitás datos clínicos del paciente (ficha, historial) usá ver_paciente
- Para crear el plan usá crear_programa con los IDs exactos de la lista de arriba
- Siempre creá 4 semanas con progresión: S1=adaptación, S2=carga, S3=choque, S4=descarga
- Balance muscular: incluí movilidad, fuerza principal y accesorio
- Ajustá series/reps según el objetivo (fuerza: 3-5 series 3-6 reps; hipertrofia: 3-4 series 8-12 reps; movilidad: 2-3 series)
- Usá español rioplatense, explicá brevemente las decisiones clínicas`;

  const allMessages: Anthropic.MessageParam[] = [...messages];
  const events: string[] = [];

  let iterations = 0;
  while (iterations < 15) {
    iterations++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system,
      tools: TOOLS,
      messages: allMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text ?? '';
      return Response.json({ reply: text, events });
    }

    if (response.stop_reason === 'tool_use') {
      allMessages.push({ role: 'assistant', content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const label = block.name === 'ver_paciente' ? 'Leyendo datos del paciente...' : 'Creando programa en la plataforma...';
        events.push(`🔧 ${label}`);
        const result = await executeTool(block.name, block.input as Record<string, any>);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      allMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  return Response.json({ reply: 'No pude completar la tarea.', events });
}