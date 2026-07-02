import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'ver_paciente',
    description: 'Datos clínicos: ficha de evaluación, dinamometrías, programas anteriores',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'crear_programa',
    description: 'Crea el programa completo. Usá los nombres EXACTOS de los ejercicios de la lista.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        nombre: { type: 'string', description: 'Título del bloque, ej: "Bloque 2 — Fuerza General"' },
        objetivo: { type: 'string' },
        dias: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              semana: { type: 'number' },
              dia: { type: 'number', description: '1=Lunes 2=Martes 3=Miérc 4=Jueves 5=Viernes 6=Sáb 7=Dom' },
              ejercicios: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nombre: { type: 'string', description: 'Nombre exacto del ejercicio de la lista' },
                    categoria: { type: 'string', description: 'Movilidad | Fuerza | Accesorio | Cardio' },
                    rir: { type: 'string' },
                    descanso: { type: 'string' },
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
                  required: ['nombre', 'series'],
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
            where: { clientId },
            orderBy: { createdAt: 'desc' },
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
        const { clientId, nombre, objetivo, dias } = input;

        // Resolve exercise names → IDs
        const allNames: string[] = [...new Set<string>(
          dias.flatMap((d: any) => d.ejercicios.map((e: any) => String(e.nombre)))
        )];

        const found = await prisma.ejercicio.findMany({
          where: { nombre: { in: allNames, mode: 'insensitive' } },
          select: { id: true, nombre: true },
        });
        const nameToId = new Map(found.map(e => [e.nombre.toLowerCase(), e.id]));

        const missing = allNames.filter(n => !nameToId.has(n.toLowerCase()));
        if (missing.length > 0) {
          return JSON.stringify({ success: false, error: `Ejercicios no encontrados (revisá los nombres): ${missing.join(', ')}` });
        }

        // Close existing open program
        await prisma.programa.updateMany({
          where: { clientId, cerradoAt: null },
          data: { cerradoAt: new Date() },
        });

        const programa = await prisma.programa.create({ data: { clientId, nombre } });

        for (const diaData of dias) {
          const diaRecord = await prisma.programaDia.create({
            data: { programaId: programa.id, semana: diaData.semana, dia: diaData.dia },
          });
          for (let i = 0; i < diaData.ejercicios.length; i++) {
            const ej = diaData.ejercicios[i];
            const ejercicioId = nameToId.get(ej.nombre.toLowerCase())!;
            const ejRecord = await prisma.programaEjercicio.create({
              data: {
                diaId: diaRecord.id,
                ejercicioId,
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

        const diasUnicos = new Set(dias.map((d: any) => d.dia)).size;
        const maxSemana = Math.max(...dias.map((d: any) => d.semana));

        await (prisma as any).aiPlanMemoria.create({
          data: {
            clientId,
            objetivo,
            tags: [],
            diasSemana: diasUnicos,
            semanas: maxSemana,
            planJson: dias,
            prompt: nombre,
          },
        });

        return JSON.stringify({
          success: true,
          url: `/professional/programas/${clientId}`,
          mensaje: `Programa "${nombre}" creado exitosamente: ${diasUnicos} días/semana × ${maxSemana} semanas.`,
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return streamError('La variable ANTHROPIC_API_KEY no está configurada. Agregala en Railway → Variables.');
  }

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

  // Pre-load: patients + exercise names grouped by patron (no UUIDs needed in prompt)
  const [clientes, ejercicios] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CLIENT', status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.ejercicio.findMany({
      where: { activo: true },
      select: { nombre: true, patron: true },
      orderBy: [{ patron: 'asc' }, { nombre: 'asc' }],
    }),
  ]);

  const grouped: Record<string, string[]> = {};
  for (const e of ejercicios) {
    if (!grouped[e.patron]) grouped[e.patron] = [];
    grouped[e.patron].push(e.nombre);
  }

  const system = `Sos el asistente de kinesiología de Nicolás Jaled Kine. Creás planes de entrenamiento completos.

PACIENTES (usá el ID exacto en crear_programa):
${clientes.map(c => `${c.name} → ID: ${c.id}`).join('\n')}

EJERCICIOS POR PATRÓN (usá el NOMBRE EXACTO en crear_programa):
${Object.entries(grouped).map(([p, ns]) => `## ${p}\n${ns.join(', ')}`).join('\n\n')}

REGLAS:
- Creá siempre 4 semanas: S1 adaptación (RIR 3-4), S2 carga (RIR 2), S3 choque (RIR 1), S4 descarga (vol -30%)
- Balance por sesión: movilidad + fuerza principal (2-3 ej) + accesorio (2-3 ej)
- Fuerza: 4x4-6 reps | Hipertrofia: 3-4x8-12 | Movilidad: 2-3x10
- Explicá brevemente las decisiones clínicas al final`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      try {
        const allMessages: Anthropic.MessageParam[] = [...messages];
        let iterations = 0;

        while (iterations < 8) {
          iterations++;

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system,
            tools: TOOLS,
            messages: allMessages,
          });

          if (response.stop_reason === 'end_turn') {
            const text = response.content.find(b => b.type === 'text')?.text ?? '';
            send({ type: 'done', reply: text });
            break;
          }

          if (response.stop_reason === 'tool_use') {
            allMessages.push({ role: 'assistant', content: response.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type !== 'tool_use') continue;
              const label = block.name === 'ver_paciente'
                ? 'Leyendo datos del paciente...'
                : 'Creando programa en la plataforma...';
              send({ type: 'event', data: label });

              const result = await executeTool(block.name, block.input as Record<string, any>);
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
            }

            allMessages.push({ role: 'user', content: toolResults });
            continue;
          }

          break;
        }
      } catch (err: any) {
        send({ type: 'done', reply: `Error: ${err.message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}

function streamError(msg: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    encoder.encode(JSON.stringify({ type: 'done', reply: msg }) + '\n'),
    { headers: { 'Content-Type': 'application/x-ndjson' } }
  );
}