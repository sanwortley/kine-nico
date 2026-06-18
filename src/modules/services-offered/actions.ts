'use server';

import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, Service } from '@/lib/mockDb';
import { prisma } from '@/lib/db';

export async function getServices() {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      return { success: true, services: getMockDb().services };
    } else {
      const services = await prisma.service.findMany({
        orderBy: { name: 'asc' },
      });
      return { success: true, services };
    }
  } catch (error: any) {
    console.error('Error in getServices', error);
    return { success: false, error: 'Error al obtener servicios' };
  }
}

export async function createService(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const duration = parseInt(formData.get('duration') as string);

    if (!name || isNaN(price) || isNaN(duration)) {
      return { success: false, error: 'Nombre, precio y duración son requeridos y deben ser números válidos' };
    }

    const now = new Date().toISOString();

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const newSrv: Service = {
        id: 'srv_' + Math.random().toString(36).substring(7),
        name,
        description: description || undefined,
        price,
        duration,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      db.services.push(newSrv);
      saveMockDb(db);
    } else {
      await prisma.service.create({
        data: { name, description: description || null, price, duration },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in createService', error);
    return { success: false, error: 'Error al crear servicio' };
  }
}

export async function updateService(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const duration = parseInt(formData.get('duration') as string);

    if (!name || isNaN(price) || isNaN(duration)) {
      return { success: false, error: 'Nombre, precio y duración válidos son requeridos' };
    }

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const srv = db.services.find(s => s.id === id);
      if (!srv) return { success: false, error: 'Servicio no encontrado' };
      srv.name = name;
      srv.description = description || undefined;
      srv.price = price;
      srv.duration = duration;
      srv.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      await prisma.service.update({
        where: { id },
        data: { name, description: description || null, price, duration },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateService', error);
    return { success: false, error: 'Error al actualizar servicio' };
  }
}

export async function toggleServiceActive(id: string, currentActive: boolean) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const srv = db.services.find(s => s.id === id);
      if (!srv) return { success: false, error: 'Servicio no encontrado' };
      srv.active = !currentActive;
      srv.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      await prisma.service.update({
        where: { id },
        data: { active: !currentActive },
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleServiceActive', error);
    return { success: false, error: 'Error' };
  }
}
