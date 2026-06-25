import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import XlsxPopulate from 'xlsx-populate';
import path from 'path';

function n(v: string | number | undefined | null): number | undefined {
  if (v == null || v === '') return undefined;
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(num) ? undefined : num;
}

function s(v: string | undefined | null): string {
  return v ?? '';
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'PROFESSIONAL' && session.role !== 'ADMIN')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const fichaId = req.nextUrl.searchParams.get('fichaId');
  if (!fichaId) return new NextResponse('fichaId required', { status: 400 });

  const ficha = await prisma.fichaEvaluacion.findUnique({
    where: { id: fichaId },
    include: { client: { select: { name: true } } },
  });
  if (!ficha) return new NextResponse('Not found', { status: 404 });

  const templatePath = path.join(process.cwd(), 'public', 'templates', 'ficha-plantilla.xlsx');
  const wb = await XlsxPopulate.fromFileAsync(templatePath);
  const ws = wb.sheet('EVALUACIÓN INICIAL');

  if (!ws) return new NextResponse('Template error', { status: 500 });

  const set = (cell: string, value: string | number | null | undefined) => {
    if (value == null || value === '') return;
    ws.cell(cell).value(value);
  };

  const hist    = (ficha.historia       ?? {}) as Record<string, string>;
  const rom     = (ficha.romTests       ?? []) as Array<{ prueba: string; der: string; izq: string; total: string; obs: string }>;
  const fuerza  = (ficha.fuerzaTests    ?? []) as Array<{ ejercicio: string; peso: string; reps: string }>;
  const cap     = (ficha.capacidadTests ?? {}) as Record<string, string>;
  const dinamo  = (ficha.dinamoExt      ?? {}) as Record<string, string>;

  // ── Datos personales ──────────────────────────────────────────────────────
  set('C5',  ficha.client.name);
  set('C8',  s(ficha.sexo));
  set('C9',  n(ficha.peso));
  set('C10', n(ficha.altura));
  set('C12', n(ficha.grasaEst));
  set('C13', s(ficha.deporte));
  set('C14', s(ficha.catPeso));

  // ── Historia ──────────────────────────────────────────────────────────────
  set('G5',  s(hist.anosEntrenando));
  set('G6',  s(hist.lesionesPasadas));
  set('G7',  s(hist.lesionesActivas));
  set('G8',  s(hist.limitaciones));
  set('G9',  s(hist.medicacion));
  set('G10', s(hist.cirugias));
  set('G11', s(hist.deportePrevio));
  set('G12', s(hist.frecuencia));
  set('G13', s(hist.ultimaCompetencia));
  set('G14', s(hist.objetivo));

  // ── ROM / FMS ─────────────────────────────────────────────────────────────
  const ROM_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  rom.slice(0, ROM_ROWS.length).forEach((r, i) => {
    const row = ROM_ROWS[i];
    set(`K${row}`, n(r.der));
    set(`L${row}`, n(r.izq));
    set(`M${row}`, n(r.total));
    set(`N${row}`, s(r.obs));
  });

  // ── Fuerza ────────────────────────────────────────────────────────────────
  const FUERZA_ROWS = [19, 20, 21, 22, 23, 24, 25, 26];
  fuerza.slice(0, FUERZA_ROWS.length).forEach((f, i) => {
    const row = FUERZA_ROWS[i];
    set(`C${row}`, n(f.peso));
    set(`D${row}`, n(f.reps));
  });

  // ── Capacidad física ──────────────────────────────────────────────────────
  const capMap: Array<[string, string]> = [
    ['cmj',       'C30'], ['sj',       'C31'], ['sprint30', 'C32'], ['plancha',    'C33'],
    ['velSquat',  'C34'], ['vo2max',   'C35'], ['km1',      'C36'],
    ['abalakov',  'H30'], ['dj30',     'H31'], ['rsiMod',   'H32'], ['saltoHoriz', 'H33'],
    ['cmjUni',    'H34'], ['djUni',    'H35'], ['multisaltos', 'H36'],
    ['singleHop', 'L30'], ['tripleHop','L31'], ['crossHop', 'L32'],
    ['timedHop',  'L33'], ['sideHop',  'L34'],
  ];
  capMap.forEach(([key, cell]) => {
    const val = cap[key];
    if (val) set(cell, isNaN(Number(val)) ? val : Number(val));
  });

  // ── Dinamometría (filas 48-59) ────────────────────────────────────────────
  const dinamoMap: Array<[string, number]> = [
    ['cuad', 48], ['isquio', 49], ['abd', 50], ['add', 51],
    ['eversor', 52], ['flexTob', 53], ['extTob', 54],
    ['rotIntHombro', 55], ['rotExtHombro', 56],
    ['abdHombro', 57], ['addHombro', 58], ['handgrip', 59],
  ];
  dinamoMap.forEach(([key, row]) => {
    set(`C${row}`, n(dinamo[`${key}Der`]));
    set(`D${row}`, n(dinamo[`${key}Izq`]));
  });

  // ── Observaciones ─────────────────────────────────────────────────────────
  set('C39', s(ficha.fortalezas));
  set('C40', s(ficha.debilidades));
  set('C41', s(ficha.prioridades));
  set('C42', s(ficha.restricciones));
  set('C43', s(ficha.objetivos12sem));
  if (ficha.fechaReevaluacion) {
    set('C44', ficha.fechaReevaluacion.toISOString().slice(0, 10));
  }

  const buffer = await wb.outputAsync();
  const nombreArchivo = `Ficha_${ficha.client.name.replace(/\s+/g, '_')}_${new Date(ficha.fecha).toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  });
}