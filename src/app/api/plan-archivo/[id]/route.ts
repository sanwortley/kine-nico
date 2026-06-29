import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const archivo = await prisma.planArchivo.findUnique({ where: { id } });
  if (!archivo) return new NextResponse('Not found', { status: 404 });

  // Client can only access their own files
  if (session.role === 'CLIENT' && archivo.clientId !== session.id) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const buffer = Buffer.from(archivo.contenido, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        archivo.tipo,
      'Content-Disposition': `inline; filename="${encodeURIComponent(archivo.nombre)}"`,
      'Content-Length':      String(buffer.length),
    },
  });
}