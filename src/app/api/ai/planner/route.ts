import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Argentina = UTC-3, no DST
const AR_OFFSET = 3;

function toArDate(d: Date) {
  return new Date(d.getTime() - AR_OFFSET * 60 * 60 * 1000);
}
function arMidnightUTC(yyyy_mm_dd: string) {
  return new Date(`${yyyy_mm_dd}T${String(AR_OFFSET).padStart(2,'0')}:00:00Z`);
}
function todayArStr() {
  return toArDate(new Date()).toISOString().split('T')[0];
}

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'ver_ejercicios',
    description: 'Devuelve todos los ejercicios disponibles agrupados por patrón. Llamalo UNA SOLA VEZ antes de crear_programa.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'ver_paciente',
    description: 'Datos clínicos: ficha de evaluación, dinamometrías, programas anteriores de un paciente',
    input_schema: {
      type: 'object' as const,
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'crear_programa',
    description: 'Crea el programa de entrenamiento completo. Usá los nombres EXACTOS de los ejercicios de la lista.',
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
  {
    name: 'agendar_turnos',
    description: 'Agenda N turnos semanales recurrentes para un paciente. Los turnos quedan en estado RESERVADO asignados al paciente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'ID del paciente' },
        serviceId: { type: 'string', description: 'ID del servicio (de la lista de servicios)' },
        professionalId: { type: 'string', description: 'ID del profesional (de la lista de profesionales)' },
        diaSemana: { type: 'number', description: '1=Lunes 2=Martes 3=Miérc 4=Jueves 5=Viernes 6=Sáb 7=Dom' },
        hora: { type: 'string', description: 'Hora en formato HH:MM, ej: "14:00"' },
        cantidadSesiones: { type: 'number', description: 'Cantidad de turnos a agendar (ej: 8)' },
        notas: { type: 'string', description: 'Notas opcionales para todos los turnos' },
      },
      required: ['clientId', 'serviceId', 'professionalId', 'diaSemana', 'hora', 'cantidadSesiones'],
    },
  },
  {
    name: 'ver_agenda',
    description: 'Muestra los turnos de un día específico (o hoy si no se especifica). Incluye IDs para poder cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD (Argentina). Si no se pasa, usa hoy.' },
      },
      required: [],
    },
  },
  {
    name: 'cancelar_turno',
    description: 'Cancela un turno por su ID. Obtené el ID llamando primero a ver_agenda.',
    input_schema: {
      type: 'object' as const,
      properties: {
        turnoId: { type: 'string', description: 'ID del turno (obtenido de ver_agenda)' },
      },
      required: ['turnoId'],
    },
  },
  {
    name: 'ver_suscripcion',
    description: 'Muestra el plan activo de un paciente y cuántas sesiones le quedan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'ver_asistencia',
    description: 'Muestra el historial de turnos completados y la última sesión de un paciente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'registrar_nota',
    description: 'Agrega una nota de evolución clínica a la ficha del paciente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        nota: { type: 'string', description: 'Texto de la nota clínica (ej: "Mejoró sentadilla +10kg")' },
      },
      required: ['clientId', 'nota'],
    },
  },
  {
    name: 'crear_ficha',
    description: 'Crea una nueva ficha de evaluación para un paciente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        peso: { type: 'number', description: 'Peso en kg' },
        altura: { type: 'number', description: 'Altura en cm' },
        sexo: { type: 'string', description: 'M o F' },
        deporte: { type: 'string' },
        objetivo: { type: 'string', description: 'Objetivo principal' },
        notas: { type: 'string', description: 'Observaciones generales' },
        restricciones: { type: 'string', description: 'Lesiones o limitaciones' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'asignar_plan',
    description: 'Asigna un plan de sesiones a un paciente (activa la suscripción manualmente).',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
        planId: { type: 'string', description: 'ID del plan (de la lista de planes)' },
      },
      required: ['clientId', 'planId'],
    },
  },
  {
    name: 'limpiar_programa',
    description: 'Elimina todos los ejercicios del programa activo de un paciente, dejándolo en blanco.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'ver_ficha',
    description: 'Devuelve el historial de fichas de evaluación de un paciente: tests de salto (CMJ, SJ, Abalakov), sprint, ROM, fuerzaTests, datos corporales, historia clínica, objetivos, fortalezas, debilidades.',
    input_schema: {
      type: 'object' as const,
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'ver_dinamometrias',
    description: 'Devuelve el historial de dinamometría de un paciente con déficits izq/der calculados para cuádriceps, isquiotibiales, abductores, adductores y eversores. También incluye ROM y velocidad de squat.',
    input_schema: {
      type: 'object' as const,
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'ver_planilla',
    description: 'Devuelve la planilla clínica completa del atleta: lesiones previas, cirugías, objetivos corto/mediano/largo plazo, disponibilidad semanal, experiencia deportiva, antecedentes.',
    input_schema: {
      type: 'object' as const,
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'buscar_pacientes',
    description: 'Busca entre todos los pacientes activos por criterios clínicos. Usalo para preguntas como "pacientes con LCA", "déficit cuád > 15%", "evaluados en junio".',
    input_schema: {
      type: 'object' as const,
      properties: {
        lesion: { type: 'string', description: 'Palabra a buscar en historial de lesiones (ej: "LCA", "rodilla", "menisco")' },
        deporte: { type: 'string', description: 'Filtra por deporte practicado' },
        deficit_cuad_min: { type: 'number', description: 'Déficit mínimo de cuádriceps en % (ej: 15 = asimetría >15%)' },
        evaluacion_desde: { type: 'string', description: 'Fecha YYYY-MM-DD: pacientes con evaluación desde esta fecha' },
        evaluacion_hasta: { type: 'string', description: 'Fecha YYYY-MM-DD: pacientes con evaluación hasta esta fecha' },
      },
      required: [],
    },
  },
];

// ── Tool executor (factory to capture session ID) ──────────────────────────────

function makeExecutor(createdById: string) {
  return async function executeTool(name: string, input: Record<string, any>): Promise<string> {
    try {
      switch (name) {

        // ── Ejercicios ─────────────────────────────────────────────────────────

        case 'ver_ejercicios': {
          const ejercicios = await prisma.ejercicio.findMany({
            where: { activo: true },
            select: { nombre: true, patron: true },
            orderBy: [{ patron: 'asc' }, { nombre: 'asc' }],
          });
          const grouped: Record<string, string[]> = {};
          for (const e of ejercicios) {
            if (!grouped[e.patron]) grouped[e.patron] = [];
            grouped[e.patron].push(e.nombre);
          }
          return Object.entries(grouped)
            .map(([p, ns]) => `## ${p}\n${ns.join(', ')}`)
            .join('\n\n');
        }

        // ── Programas ──────────────────────────────────────────────────────────

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
            return JSON.stringify({ success: false, error: `Ejercicios no encontrados: ${missing.join(', ')}` });
          }
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
                data: { diaId: diaRecord.id, ejercicioId, orden: i + 1, categoria: ej.categoria ?? '', rir: ej.rir ?? '', descanso: ej.descanso ?? '90s' },
              });
              for (const serie of ej.series) {
                await prisma.programaSerie.create({
                  data: { programaEjercicioId: ejRecord.id, numero: serie.numero, reps: serie.reps ?? null, kg: serie.kg ?? null },
                });
              }
            }
          }
          const diasUnicos = new Set(dias.map((d: any) => d.dia)).size;
          const maxSemana = Math.max(...dias.map((d: any) => d.semana));
          await (prisma as any).aiPlanMemoria.create({
            data: { clientId, objetivo, tags: [], diasSemana: diasUnicos, semanas: maxSemana, planJson: dias, prompt: nombre },
          });
          return JSON.stringify({
            success: true,
            url: `/professional/programas/${clientId}`,
            mensaje: `Programa "${nombre}" creado: ${diasUnicos} días/semana × ${maxSemana} semanas.`,
          });
        }

        // ── Turnos ─────────────────────────────────────────────────────────────

        case 'agendar_turnos': {
          const { clientId, serviceId, professionalId, diaSemana, hora, cantidadSesiones, notas } = input;
          const [professional, service] = await Promise.all([
            prisma.professional.findUnique({ where: { id: professionalId }, select: { id: true, name: true } }),
            prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, name: true, duration: true } }),
          ]);
          if (!professional) return JSON.stringify({ success: false, error: `Profesional no encontrado: ${professionalId}` });
          if (!service) return JSON.stringify({ success: false, error: `Servicio no encontrado: ${serviceId}` });

          const jsDayOfWeek = diaSemana === 7 ? 0 : (diaSemana as number);
          const [hh, mm] = hora.split(':').map(Number);

          const start = new Date();
          start.setUTCDate(start.getUTCDate() + 1);
          start.setUTCHours(AR_OFFSET, 0, 0, 0);

          const daysUntil = (jsDayOfWeek - start.getUTCDay() + 7) % 7;
          const firstDate = new Date(start);
          firstDate.setUTCDate(firstDate.getUTCDate() + daysUntil);
          firstDate.setUTCHours(hh + AR_OFFSET, mm, 0, 0);

          const dates: Date[] = [];
          for (let i = 0; i < cantidadSesiones; i++) {
            const d = new Date(firstDate);
            d.setUTCDate(d.getUTCDate() + i * 7);
            dates.push(d);
          }

          const existing = await prisma.turno.findMany({
            where: { fechaInicio: { in: dates }, professionalId: professional.id },
            select: { fechaInicio: true },
          });
          const existingMs = new Set(existing.map(t => t.fechaInicio.getTime()));
          const toCreate = dates
            .filter(d => !existingMs.has(d.getTime()))
            .map(fechaInicio => ({
              fechaInicio, duracion: service.duration, estado: 'RESERVADO' as const,
              serviceId: service.id, professionalId: professional.id, clientId, createdById,
              ...(notas ? { notas } : {}),
            }));

          const skipped = dates.length - toCreate.length;
          if (toCreate.length === 0) {
            return JSON.stringify({ success: false, error: 'Todos los horarios ya tienen turnos cargados.' });
          }

          await (prisma as any).turno.createMany({ data: toCreate });

          const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const resumen = toCreate
            .map(t => `${DIAS[t.fechaInicio.getUTCDay()]} ${t.fechaInicio.toLocaleDateString('es-AR', { timeZone: 'UTC' })} ${hora}hs`)
            .join(' · ');
          return JSON.stringify({
            success: true, turnosCreados: toCreate.length, omitidos: skipped,
            mensaje: `Se agendaron ${toCreate.length} turnos${skipped > 0 ? ` (${skipped} omitidos por conflicto)` : ''}: ${resumen}`,
          });
        }

        case 'ver_agenda': {
          const fecha = input.fecha ?? todayArStr();
          const desde = arMidnightUTC(fecha);
          const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);

          const turnos = await prisma.turno.findMany({
            where: { fechaInicio: { gte: desde, lt: hasta } },
            include: {
              client: { select: { id: true, name: true } },
              service: { select: { name: true } },
              professional: { select: { name: true } },
            },
            orderBy: { fechaInicio: 'asc' },
          });

          if (turnos.length === 0) return JSON.stringify({ turnos: [], mensaje: `No hay turnos el ${fecha}.` });

          const lista = turnos.map(t => ({
            id: t.id,
            hora: toArDate(t.fechaInicio).toISOString().slice(11, 16) + 'hs',
            estado: t.estado,
            cliente: (t as any).client?.name ?? '(disponible)',
            servicio: (t as any).service.name,
            profesional: (t as any).professional.name,
          }));
          return JSON.stringify({ fecha, turnos: lista });
        }

        case 'cancelar_turno': {
          const { turnoId } = input;
          const turno = await prisma.turno.findUnique({
            where: { id: turnoId },
            include: { client: { select: { name: true } }, service: { select: { name: true } } },
          });
          if (!turno) return JSON.stringify({ success: false, error: 'Turno no encontrado.' });

          await prisma.turno.update({
            where: { id: turnoId },
            data: { estado: 'CANCELADO', version: { increment: 1 } },
          });

          const horaAr = toArDate(turno.fechaInicio).toISOString().slice(11, 16);
          const fechaAr = toArDate(turno.fechaInicio).toLocaleDateString('es-AR');
          return JSON.stringify({
            success: true,
            mensaje: `Turno cancelado: ${(turno as any).client?.name ?? '(sin cliente)'} — ${(turno as any).service.name} el ${fechaAr} a las ${horaAr}hs.`,
          });
        }

        case 'ver_suscripcion': {
          const { clientId } = input;
          const now = new Date();
          const sub = await (prisma as any).subscription.findFirst({
            where: { userId: clientId, estado: 'ACTIVE', OR: [{ fechaFin: null }, { fechaFin: { gt: now } }] },
            include: { plan: true },
            orderBy: { fechaInicio: 'desc' },
          });
          if (!sub) return JSON.stringify({ suscripcion: null, mensaje: 'El paciente no tiene suscripción activa.' });

          return JSON.stringify({
            plan: sub.plan.nombre,
            sesionesRestantes: sub.turnosRestantes,
            fechaInicio: sub.fechaInicio,
            fechaFin: sub.fechaFin,
            estado: sub.estado,
          });
        }

        case 'ver_asistencia': {
          const { clientId } = input;
          const completados = await prisma.turno.findMany({
            where: { clientId, estado: 'COMPLETADO' },
            include: { service: { select: { name: true } } },
            orderBy: { fechaInicio: 'desc' },
            take: 10,
          });
          if (completados.length === 0) {
            return JSON.stringify({ sesiones: [], mensaje: 'No hay sesiones completadas registradas.' });
          }
          const sesiones = completados.map(t => ({
            fecha: toArDate(t.fechaInicio).toLocaleDateString('es-AR'),
            hora: toArDate(t.fechaInicio).toISOString().slice(11, 16) + 'hs',
            servicio: (t as any).service.name,
          }));
          return JSON.stringify({ totalCompletadas: completados.length, ultimaSesion: sesiones[0].fecha, sesiones });
        }

        // ── Clínico ────────────────────────────────────────────────────────────

        case 'registrar_nota': {
          const { clientId, nota } = input;
          const fechaHoy = toArDate(new Date()).toLocaleDateString('es-AR');
          const notaConFecha = `[${fechaHoy}] ${nota}`;

          const fichaExistente = await prisma.fichaEvaluacion.findFirst({
            where: { clientId },
            orderBy: { fecha: 'desc' },
            select: { id: true, notas: true },
          });

          if (fichaExistente) {
            const notasActualizadas = fichaExistente.notas
              ? `${fichaExistente.notas}\n${notaConFecha}`
              : notaConFecha;
            await prisma.fichaEvaluacion.update({
              where: { id: fichaExistente.id },
              data: { notas: notasActualizadas },
            });
          } else {
            await prisma.fichaEvaluacion.create({
              data: { clientId, notas: notaConFecha },
            });
          }

          return JSON.stringify({ success: true, mensaje: `Nota registrada en ficha: "${notaConFecha}"` });
        }

        case 'crear_ficha': {
          const { clientId, peso, altura, sexo, deporte, objetivo, notas, restricciones } = input;
          await prisma.fichaEvaluacion.create({
            data: {
              clientId,
              ...(peso != null ? { peso } : {}),
              ...(altura != null ? { altura } : {}),
              ...(sexo ? { sexo } : {}),
              ...(deporte ? { deporte } : {}),
              ...(notas ? { notas } : {}),
              ...(restricciones ? { restricciones } : {}),
              ...(objetivo ? { objetivos12sem: objetivo } : {}),
            },
          });
          return JSON.stringify({ success: true, mensaje: 'Ficha de evaluación creada exitosamente.' });
        }

        // ── Administrativo ─────────────────────────────────────────────────────

        case 'asignar_plan': {
          const { clientId, planId } = input;
          const plan = await prisma.plan.findUnique({ where: { id: planId } });
          if (!plan) return JSON.stringify({ success: false, error: `Plan no encontrado: ${planId}` });

          await (prisma as any).subscription.updateMany({
            where: { userId: clientId, estado: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
            data: { estado: 'CANCELLED', fechaFin: new Date() },
          });

          const now = new Date();
          const daysMap: Record<string, number> = { week: 7, month: 30 };
          const days = daysMap[(plan as any).interval] ?? 45;

          await (prisma as any).subscription.create({
            data: {
              userId: clientId, planId, estado: 'ACTIVE',
              turnosRestantes: (plan as any).limiteTurnos,
              fechaInicio: now,
              fechaFin: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
              paymentGateway: 'MANUAL',
            },
          });

          return JSON.stringify({
            success: true,
            mensaje: `Plan "${(plan as any).nombre}" asignado: ${(plan as any).limiteTurnos} sesiones activadas.`,
          });
        }

        case 'limpiar_programa': {
          const { clientId } = input;
          const programa = await prisma.programa.findFirst({
            where: { clientId, cerradoAt: null },
            select: { id: true, nombre: true },
          });
          if (!programa) return JSON.stringify({ success: false, error: 'No hay programa activo para ese paciente.' });
          await prisma.programaDia.deleteMany({ where: { programaId: programa.id } });
          return JSON.stringify({ success: true, mensaje: `Programa "${(programa as any).nombre}" limpiado. Todos los ejercicios fueron eliminados.` });
        }

        // ── Clínico extendido ──────────────────────────────────────────────────

        case 'ver_ficha': {
          const { clientId } = input;
          const fichas = await prisma.fichaEvaluacion.findMany({
            where: { clientId },
            orderBy: { fecha: 'desc' },
          });
          if (fichas.length === 0) return JSON.stringify({ fichas: [], mensaje: 'El paciente no tiene fichas de evaluación registradas.' });
          const formatted = fichas.map(f => ({
            fecha: toArDate(f.fecha).toLocaleDateString('es-AR'),
            peso: f.peso, altura: f.altura, sexo: f.sexo, deporte: f.deporte,
            historia: f.historia,
            romTests: f.romTests,
            fuerzaTests: f.fuerzaTests,
            capacidadTests: f.capacidadTests,
            dinamoExt: f.dinamoExt,
            fortalezas: f.fortalezas, debilidades: f.debilidades,
            prioridades: f.prioridades, restricciones: f.restricciones,
            objetivos12sem: f.objetivos12sem, notas: f.notas,
            fechaReevaluacion: f.fechaReevaluacion
              ? toArDate(f.fechaReevaluacion).toLocaleDateString('es-AR')
              : null,
          }));
          return JSON.stringify({ total: fichas.length, fichas: formatted });
        }

        case 'ver_dinamometrias': {
          const { clientId } = input;
          const registros = await prisma.dinamometria.findMany({
            where: { clientId },
            orderBy: { fecha: 'desc' },
          });
          if (registros.length === 0) return JSON.stringify({ registros: [], mensaje: 'El paciente no tiene evaluaciones de dinamometría.' });

          function defPct(a: number | null | undefined, b: number | null | undefined) {
            if (!a || !b) return null;
            return (Math.abs(a - b) / Math.max(a, b) * 100).toFixed(1) + '%';
          }

          const evaluaciones = registros.map(r => ({
            fecha: toArDate(r.fecha).toLocaleDateString('es-AR'),
            peso: r.peso, altura: r.altura,
            cuadriceps:     { der: r.cuadDer,    izq: r.cuadIzq,    deficit: defPct(r.cuadDer, r.cuadIzq) },
            isquiotibiales: { der: r.isquioDer,  izq: r.isquioIzq,  deficit: defPct(r.isquioDer, r.isquioIzq) },
            abductores:     { der: r.abdDer,     izq: r.abdIzq,     deficit: defPct(r.abdDer, r.abdIzq) },
            adductores:     { der: r.addDer,     izq: r.addIzq,     deficit: defPct(r.addDer, r.addIzq) },
            eversores:      { der: r.eversorDer, izq: r.eversorIzq, deficit: defPct(r.eversorDer, r.eversorIzq) },
            rom: {
              cadera:  { der: r.romCaderaDer,  izq: r.romCaderaIzq },
              tobillo: { der: r.romTobilloDer, izq: r.romTobilloIzq },
            },
            velocidadSquat: r.velocidadSquat,
            notas: r.notas,
          }));
          return JSON.stringify({ total: registros.length, evaluaciones });
        }

        case 'ver_planilla': {
          const { clientId } = input;
          const planilla = await (prisma as any).planillaAtleta.findUnique({ where: { clientId } });
          if (!planilla) return JSON.stringify({ planilla: null, mensaje: 'El paciente no tiene planilla clínica registrada.' });
          return JSON.stringify(planilla);
        }

        case 'buscar_pacientes': {
          const { lesion, deporte, deficit_cuad_min, evaluacion_desde, evaluacion_hasta } = input;

          const todos = await prisma.user.findMany({
            where: { role: 'CLIENT', status: 'ACTIVE' },
            select: { id: true, name: true },
          });
          const ids = todos.map(c => c.id);

          const [planillas, fichas, dinamos] = await Promise.all([
            (prisma as any).planillaAtleta.findMany({ where: { clientId: { in: ids } } }),
            prisma.fichaEvaluacion.findMany({
              where: {
                clientId: { in: ids },
                ...(evaluacion_desde ? { fecha: { gte: new Date(evaluacion_desde) } } : {}),
                ...(evaluacion_hasta ? { fecha: { lte: new Date(evaluacion_hasta + 'T23:59:59Z') } } : {}),
              },
              orderBy: { fecha: 'desc' },
              select: { clientId: true, fecha: true, deporte: true, historia: true, restricciones: true },
            }),
            prisma.dinamometria.findMany({
              where: { clientId: { in: ids } },
              orderBy: { fecha: 'desc' },
              select: { clientId: true, fecha: true, cuadDer: true, cuadIzq: true },
            }),
          ]);

          const planillaMap = new Map((planillas as any[]).map(p => [p.clientId, p]));
          const fichasMap = new Map<string, typeof fichas>();
          for (const f of fichas) {
            if (!fichasMap.has(f.clientId)) fichasMap.set(f.clientId, []);
            fichasMap.get(f.clientId)!.push(f);
          }
          const dinamoMap = new Map<string, typeof dinamos[0]>();
          for (const d of dinamos) {
            if (!dinamoMap.has(d.clientId)) dinamoMap.set(d.clientId, d);
          }

          const resultados: any[] = [];
          const hasCriteria = lesion || deporte || deficit_cuad_min != null || evaluacion_desde || evaluacion_hasta;

          for (const c of todos) {
            const pl = planillaMap.get(c.id) as any;
            const cFichas = fichasMap.get(c.id) ?? [];
            const dinamo = dinamoMap.get(c.id) as any;
            const info: any = { id: c.id, nombre: c.name };
            let ok = !hasCriteria;

            if (lesion) {
              const q = lesion.toLowerCase();
              const enPl = pl && [pl.lesionesCx, pl.lesionesPrevias, pl.antecedentes, pl.motivoConsulta]
                .some((v: any) => typeof v === 'string' && v.toLowerCase().includes(q));
              const enFicha = cFichas.some(f => {
                const h = f.historia as any;
                return [h?.lesionesPasadas, h?.lesionesActivas, h?.limitaciones, f.restricciones]
                  .some((v: any) => typeof v === 'string' && v.toLowerCase().includes(q));
              });
              if (enPl || enFicha) { ok = true; info.lesion = lesion; }
              else continue;
            }

            if (deporte) {
              const q = deporte.toLowerCase();
              const enPl = pl?.tipoEntrenamiento?.toLowerCase().includes(q);
              const enFicha = cFichas.some(f => (f as any).deporte?.toLowerCase().includes(q));
              if (enPl || enFicha) { ok = true; info.deporte = deporte; }
              else continue;
            }

            if (deficit_cuad_min != null) {
              if (!dinamo?.cuadDer || !dinamo?.cuadIzq) continue;
              const pct = Math.abs(dinamo.cuadDer - dinamo.cuadIzq) / Math.max(dinamo.cuadDer, dinamo.cuadIzq) * 100;
              if (pct < deficit_cuad_min) continue;
              ok = true;
              info.deficit_cuad = pct.toFixed(1) + '%';
            }

            if ((evaluacion_desde || evaluacion_hasta) && cFichas.length === 0) continue;
            if ((evaluacion_desde || evaluacion_hasta) && cFichas.length > 0) {
              ok = true;
              info.evaluaciones = cFichas.length;
              info.ultimaEvaluacion = toArDate(cFichas[0].fecha).toLocaleDateString('es-AR');
            }

            if (ok) resultados.push(info);
          }

          if (resultados.length === 0) return JSON.stringify({ pacientes: [], mensaje: 'No se encontraron pacientes con esos criterios.' });
          return JSON.stringify({ total: resultados.length, pacientes: resultados });
        }

        default:
          return `Herramienta desconocida: ${name}`;
      }
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  };
}

// ── Tools that complete the action loop ───────────────────────────────────────

const ACTION_TOOLS = new Set([
  'crear_programa', 'agendar_turnos', 'cancelar_turno',
  'registrar_nota', 'crear_ficha', 'asignar_plan', 'limpiar_programa',
]);

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

  const executeTool = makeExecutor(session.id);

  // Pre-load context (exercises excluded — loaded on-demand via ver_ejercicios tool)
  const [clientes, servicios, profesionales, planes] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CLIENT', status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, duration: true },
      orderBy: { name: 'asc' },
    }),
    prisma.professional.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.plan.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, limiteTurnos: true, price: true },
      orderBy: { nombre: 'asc' },
    }),
  ]);

  const hoyAr = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const system = `Sos el asistente de kinesiología de Nicolás Jaled Kine. Podés crear programas, agendar turnos, consultar agenda, gestionar suscripciones y registrar notas clínicas.

HOY (Argentina): ${hoyAr}

PACIENTES (usá el ID exacto en las herramientas):
${clientes.map(c => `${c.name} → ID: ${c.id}`).join('\n')}

SERVICIOS (para agendar_turnos):
${servicios.map(s => `${s.name} (${s.duration} min) → ID: ${s.id}`).join('\n')}

PROFESIONALES (para agendar_turnos):
${profesionales.map(p => `${p.name} → ID: ${p.id}`).join('\n')}

PLANES (para asignar_plan):
${planes.map(p => `${(p as any).nombre} (${(p as any).limiteTurnos} sesiones) → ID: ${p.id}`).join('\n')}

REGLAS GENERALES:
- Para crear un programa: primero llamá ver_ejercicios UNA SOLA VEZ para ver la lista, luego planificá las 4 semanas COMPLETAS y llamá crear_programa UNA SOLA VEZ.
- Para cancelar un turno: primero llamá ver_agenda para obtener el ID, luego cancelar_turno.
- Para turnos recurrentes: usá agendar_turnos UNA SOLA VEZ con todos los datos.
- Para análisis clínico de un paciente: usá ver_ficha (tests CMJ/fuerza/ROM), ver_dinamometrias (déficits izq/der), ver_planilla (lesiones/objetivos).
- Para preguntas sobre múltiples pacientes ("los que tienen LCA", "déficit >15%"): usá buscar_pacientes.
- Confirmá siempre al profesional qué acción se realizó y con qué resultado.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      // Keepalive: send a blank line every 15s so iOS Safari doesn't drop the connection
      let keepalive: ReturnType<typeof setInterval> | null = null;
      const startKeepalive = () => {
        keepalive = setInterval(() => {
          try { controller.enqueue(encoder.encode('\n')); } catch {}
        }, 15_000);
      };
      const stopKeepalive = () => {
        if (keepalive) { clearInterval(keepalive); keepalive = null; }
      };

      try {
        const allMessages: Anthropic.MessageParam[] = [...messages];
        let iterations = 0;

        while (iterations < 10) {
          iterations++;

          startKeepalive();
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system,
            tools: TOOLS,
            messages: allMessages,
          });
          stopKeepalive();

          if (response.stop_reason === 'end_turn') {
            const text = response.content.find(b => b.type === 'text')?.text ?? '';
            send({ type: 'done', reply: text });
            break;
          }

          if (response.stop_reason === 'tool_use') {
            allMessages.push({ role: 'assistant', content: response.content });
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            let actionCompleted = false;

            for (const block of response.content) {
              if (block.type !== 'tool_use') continue;

              const labels: Record<string, string> = {
                ver_ejercicios: 'Cargando lista de ejercicios...',
                ver_paciente: 'Leyendo datos del paciente...',
                crear_programa: 'Creando programa en la plataforma...',
                agendar_turnos: 'Agendando turnos en el calendario...',
                ver_agenda: 'Consultando agenda...',
                cancelar_turno: 'Cancelando turno...',
                ver_suscripcion: 'Consultando suscripción...',
                ver_asistencia: 'Consultando historial de asistencia...',
                registrar_nota: 'Registrando nota clínica...',
                crear_ficha: 'Creando ficha de evaluación...',
                asignar_plan: 'Asignando plan al paciente...',
                limpiar_programa: 'Limpiando ejercicios del programa...',
                ver_ficha: 'Consultando fichas de evaluación...',
                ver_dinamometrias: 'Consultando historial de dinamometría...',
                ver_planilla: 'Consultando planilla clínica...',
                buscar_pacientes: 'Buscando pacientes con esos criterios...',
              };
              send({ type: 'event', data: labels[block.name] ?? 'Procesando...' });

              const result = await executeTool(block.name, block.input as Record<string, any>);
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });

              if (ACTION_TOOLS.has(block.name)) {
                try { if (JSON.parse(result).success) actionCompleted = true; } catch {}
              }
            }

            allMessages.push({ role: 'user', content: toolResults });

            if (actionCompleted) {
              startKeepalive();
              const final = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 1000,
                system,
                tools: TOOLS,
                messages: allMessages,
              });
              stopKeepalive();
              const text = final.content.find(b => b.type === 'text')?.text ?? 'Acción completada.';
              send({ type: 'done', reply: text });
              break;
            }

            continue;
          }

          break;
        }
      } catch (err: any) {
        stopKeepalive();
        send({ type: 'done', reply: `Error: ${err.message}` });
      } finally {
        stopKeepalive();
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