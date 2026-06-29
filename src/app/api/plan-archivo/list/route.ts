import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'CLIENT') return new NextResponse('Forbidden', { status: 403 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) return new NextResponse('Missing clientId', { status: 400 });

  const archivos = await prisma.planArchivo.findMany({
    where: { clientId },
    select: { id: true, nombre: true, tipo: true, tamano: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(archivos);
}