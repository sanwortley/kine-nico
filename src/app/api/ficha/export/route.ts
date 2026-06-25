import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';
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

  // Load template
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'ficha-plantilla.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const ws = wb.getWorksheet('EVALUACIÓN INICIAL');
  if (!ws) return new NextResponse('Template error', { status: 500 });

  const hist = (ficha.historia ?? {}) as Record<string, string>;
  const rom = (ficha.romTests ?? []) as Array<{ prueba: string; der: string; izq: string; total: string; obs: string }>;
  const fuerza = (ficha.fuerzaTests ?? []) as Array<{ ejercicio: string; peso: string; reps: string }>;
  const cap = (ficha.capacidadTests ?? {}) as Record<string, string>;
  const dinamo = (ficha.dinamoExt ?? {}) as Record<string, string>;

  // ── Datos personales ──────────────────────────────────────────────────────

  ws.getCell('C5').value = ficha.client.name;
  ws.getCell('C9').value = n(ficha.peso) ?? null;
  ws.getCell('C10').value = n(ficha.altura) ?? null;
  ws.getCell('C8').value = s(ficha.sexo);
  ws.getCell('C12').value = n(ficha.grasaEst) ?? null;
  ws.getCell('C13').value = s(ficha.deporte);
  ws.getCell('C14').value = s(ficha.catPeso);

  // ── Historia ──────────────────────────────────────────────────────────────

  ws.getCell('G5').value = s(hist.anosEntrenando);
  ws.getCell('G6').value = s(hist.lesionesPasadas);
  ws.getCell('G7').value = s(hist.lesionesActivas);
  ws.getCell('G8').value = s(hist.limitaciones);
  ws.getCell('G9').value = s(hist.medicacion);
  ws.getCell('G10').value = s(hist.cirugias);
  ws.getCell('G11').value = s(hist.deportePrevio);
  ws.getCell('G12').value = s(hist.frecuencia);
  ws.getCell('G13').value = s(hist.ultimaCompetencia);
  ws.getCell('G14').value = s(hist.objetivo);

  // ── ROM / FMS — filas 6-18 ────────────────────────────────────────────────
  // K = Der, L = Izq, M = Total, N = Observaciones

  const ROM_ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  rom.slice(0, ROM_ROWS.length).forEach((r, i) => {
    const row = ROM_ROWS[i];
    ws.getCell(`K${row}`).value = r.der !== '' ? Number(r.der) : null;
    ws.getCell(`L${row}`).value = r.izq !== '' ? Number(r.izq) : null;
    ws.getCell(`M${row}`).value = r.total !== '' ? Number(r.total) : null;
    ws.getCell(`N${row}`).value = s(r.obs);
  });

  // ── Fuerza — filas 19-26 (C=peso, D=reps; F,G,H son fórmulas del template)

  const FUERZA_ROWS = [19, 20, 21, 22, 23, 24, 25, 26];
  fuerza.slice(0, FUERZA_ROWS.length).forEach((f, i) => {
    const row = FUERZA_ROWS[i];
    ws.getCell(`C${row}`).value = n(f.peso) ?? null;
    ws.getCell(`D${row}`).value = n(f.reps) ?? null;
  });

  // ── Capacidad física ──────────────────────────────────────────────────────

  const capMap: Array<[string, string]> = [
    ['cmj', 'C30'], ['sj', 'C31'], ['sprint30', 'C32'], ['plancha', 'C33'],
    ['velSquat', 'C34'], ['vo2max', 'C35'], ['km1', 'C36'],
    ['abalakov', 'H30'], ['dj30', 'H31'], ['rsiMod', 'H32'], ['saltoHoriz', 'H33'],
    ['cmjUni', 'H34'], ['djUni', 'H35'], ['multisaltos', 'H36'],
    ['singleHop', 'L30'], ['tripleHop', 'L31'], ['crossHop', 'L32'],
    ['timedHop', 'L33'], ['sideHop', 'L34'],
  ];
  capMap.forEach(([key, cell]) => {
    const val = cap[key];
    if (val) ws.getCell(cell).value = isNaN(Number(val)) ? val : Number(val);
  });

  // ── Dinamometría — filas 48-60 (C=Der, D=Izq) ────────────────────────────

  const dinamoMap: Array<[string, number]> = [
    ['cuad', 48], ['isquio', 49], ['abd', 50], ['add', 51],
    ['eversor', 52], ['flexTob', 53], ['extTob', 54],
    ['rotIntHombro', 55], ['rotExtHombro', 56],
    ['abdHombro', 57], ['addHombro', 58], ['handgrip', 59],
  ];
  dinamoMap.forEach(([key, row]) => {
    const der = n(dinamo[`${key}Der`]);
    const izq = n(dinamo[`${key}Izq`]);
    if (der !== undefined) ws.getCell(`C${row}`).value = der;
    if (izq !== undefined) ws.getCell(`D${row}`).value = izq;
  });

  // ── Observaciones — filas 39-44 ───────────────────────────────────────────

  ws.getCell('C39').value = s(ficha.fortalezas);
  ws.getCell('C40').value = s(ficha.debilidades);
  ws.getCell('C41').value = s(ficha.prioridades);
  ws.getCell('C42').value = s(ficha.restricciones);
  ws.getCell('C43').value = s(ficha.objetivos12sem);
  if (ficha.fechaReevaluacion) {
    ws.getCell('C44').value = ficha.fechaReevaluacion;
    ws.getCell('C44').numFmt = 'dd/mm/yyyy';
  }

  // ── Generar buffer y respuesta ────────────────────────────────────────────

  const buffer = await wb.xlsx.writeBuffer();
  const nombreArchivo = `Ficha_${ficha.client.name.replace(/\s+/g, '_')}_${new Date(ficha.fecha).toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  });
}