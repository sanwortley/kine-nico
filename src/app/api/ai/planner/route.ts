import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Sos un asistente de kinesiología y entrenamiento deportivo para Nicolás Jaled Kine, profesional especializado en rehabilitación y performance deportiva.

Tu tarea es ayudar al profesional a crear planes de entrenamiento completos para sus pacientes usando las herramientas disponibles.

Cuando te pidan crear un plan:
1. Usá ver_paciente para conocer los datos clínicos del paciente
2. Usá buscar_memoria para ver planes similares que ya funcionaron
3. Usá ver_ejercicios para elegir ejercicios apropiados por patrón de movimiento
4. Usá crear_programa para crear el plan completo en la plataforma

Al crear el plan, pensá como kinesiólogo:
- Progresión lógica de cargas semana a semana (semana 1 = adaptación, semana 2 = carga, semana 3 = choque, semana 4 = descarga si son 4 semanas)
- Balance muscular (empuje/tirón, cadena anterior/posterior)
- Adecuado al nivel y objetivos del paciente
- Considerá las limitaciones o lesiones si las hay

Usá español rioplatense, tono directo y profesional. Explicá brevemente las decisiones clínicas que tomaste.`;

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'listar_pacientes',
    description: 'Lista todos los pacientes activos con nombre e ID',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'ver_paciente',
    description: 'Obtiene datos completos de un paciente: ficha de evaluación, dinamometrías, programas anteriores cerrados',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'ID del paciente' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'ver_ejercicios',
    description: 'Lista ejercicios de la biblioteca filtrados por patrón de movimiento',
    input_schema: {
      type: 'object' as const,
      properties: {
        patron: { type: 'string', description: 'Patrón de movimiento. Ejemplos: "Cadena Posterior", "Empuje Horizontal", "Tirón Vertical", "Core", "Movilidad"' },
      },
      required: [],
    },
  },
  {
    name: 'buscar_memoria',
    description: 'Busca planes de entrenamiento anteriores similares para aprender de ellos',
    input_schema: {
      type: 'object' as const,
      properties: {
        objetivo: { type: 'string', description: 'Objetivo o tipo de plan' },
        diasSemana: { type: 'number', description: 'Días por semana (opcional)' },
      },
      required: ['objetivo'],
    },
  },
  {
    name: 'crear_programa',
    description: 'Crea un programa de entrenamiento completo en la plataforma para el paciente. Creá siempre al menos 4 semanas con ejercicios completos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        nombre: { type: 'string', description: 'Nombre del bloque ej: "Bloque 2 — Fuerza Base"' },
        objetivo: { type: 'string', description: 'Objetivo clínico resumido' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags para búsqueda futura ej: ["fuerza", "pierna", "rehabilitación"]' },
        dias: {
          type: 'array',
          description: 'Array de días del programa. Cada día tiene semana (1-4), dia (1=Lunes, 2=Martes... 7=Domingo) y ejercicios.',
          items: {
            type: 'object',
            properties: {
              semana: { type: 'number' },
              dia: { type: 'number' },
              ejercicios: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ejercicioId: { type: 'string' },
                    categoria: { type: 'string' },
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
      case 'listar_pacientes': {
        const clientes = await prisma.user.findMany({
          where: { role: 'CLIENT', status: 'ACTIVE' },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        });
        return JSON.stringify(clientes);
      }

      case 'ver_paciente': {
        const { clientId } = input;
        const [client, ficha, dinamometrias, programas] = await Promise.all([
          prisma.user.findUnique({ where: { id: clientId }, select: { id: true, name: true, email: true } }),
          prisma.fichaEvaluacion.findFirst({
            where: { clientId },
            orderBy: { fecha: 'desc' },
          }),
          prisma.dinamometria.findMany({
            where: { clientId },
            orderBy: { fecha: 'desc' },
            take: 3,
          }),
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
                    take: 5,
                  },
                },
              },
            },
          }),
        ]);
        return JSON.stringify({ client, ficha, dinamometrias, programasAnteriores: programas });
      }

      case 'ver_ejercicios': {
        const { patron } = input;
        const ejercicios = await prisma.ejercicio.findMany({
          where: {
            activo: true,
            ...(patron ? { patron: { contains: patron, mode: 'insensitive' as const } } : {}),
          },
          select: { id: true, nombre: true, patron: true },
          orderBy: [{ patron: 'asc' }, { nombre: 'asc' }],
        });
        return JSON.stringify(ejercicios);
      }

      case 'buscar_memoria': {
        const { objetivo, diasSemana } = input;
        const planes = await (prisma as any).aiPlanMemoria.findMany({
          where: {
            OR: [
              { objetivo: { contains: objetivo, mode: 'insensitive' } },
              { tags: { has: objetivo.toLowerCase() } },
            ],
            ...(diasSemana ? { diasSemana } : {}),
          },
          orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
          take: 3,
        });
        if (!planes.length) return 'No hay planes similares en memoria todavía. Este será el primero.';
        return JSON.stringify(planes.map((p: any) => ({
          objetivo: p.objetivo,
          tags: p.tags,
          diasSemana: p.diasSemana,
          rating: p.rating,
          plan: p.planJson,
        })));
      }

      case 'crear_programa': {
        const { clientId, nombre, objetivo, tags = [], dias } = input;

        // Close any open program first
        const activo = await prisma.programa.findFirst({ where: { clientId, cerradoAt: null } });
        if (activo) {
          await prisma.programa.update({ where: { id: activo.id }, data: { cerradoAt: new Date() } });
        }

        // Create the new program
        const programa = await prisma.programa.create({ data: { clientId, nombre } });

        // Create all dias and exercises
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

        // Save to AI memory for learning
        const diasUnicos = [...new Set(dias.map((d: any) => d.dia))].length;
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
          mensaje: `Programa "${nombre}" creado con ${dias.length} días distribuidos en ${Math.max(...dias.map((d: any) => d.semana))} semanas.`,
          url: `/professional/programas/${clientId}`,
        });
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
  } catch (err: any) {
    return `Error ejecutando ${name}: ${err.message}`;
  }
}

// ── Agentic loop ───────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role === 'CLIENT') {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

  const events: string[] = [];
  const allMessages: Anthropic.MessageParam[] = [...messages];

  let iterations = 0;
  const MAX_ITER = 10;

  while (iterations < MAX_ITER) {
    iterations++;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: SYSTEM,
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

        events.push(`🔧 ${toolLabel(block.name)}`);
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

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    listar_pacientes: 'Consultando pacientes...',
    ver_paciente: 'Leyendo datos del paciente...',
    ver_ejercicios: 'Buscando ejercicios...',
    buscar_memoria: 'Buscando planes similares...',
    crear_programa: 'Creando programa en la plataforma...',
  };
  return map[name] ?? name;
}