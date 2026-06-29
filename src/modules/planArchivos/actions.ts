'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function subirPlanArchivo(formData: FormData) {
  const session = await getSession();
  if (!session || session.role === 'CLIENT') return { error: 'Sin permisos' };

  const clientId = formData.get('clientId') as string;
  const file     = formData.get('archivo') as File | null;

  if (!clientId || !file) return { error: 'Datos incompletos' };
  if (file.size > MAX_BYTES) return { error: `Archivo demasiado grande (máx. 15 MB)` };

  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
  if (!allowed.includes(file.type)) return { error: 'Tipo de archivo no permitido (PDF, Word, imagen)' };

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  await prisma.planArchivo.create({
    data: {
      clientId,
      nombre:    file.name,
      tipo:      file.type,
      tamano:    file.size,
      contenido: base64,
    },
  });

  return { ok: true };
}

export async function eliminarPlanArchivo(id: string) {
  const session = await getSession();
  if (!session || session.role === 'CLIENT') return { error: 'Sin permisos' };
  await prisma.planArchivo.delete({ where: { id } });
  return { ok: true };
}

export async function getPlanesArchivo(clientId: string) {
  return prisma.planArchivo.findMany({
    where: { clientId },
    select: { id: true, nombre: true, tipo: true, tamano: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}