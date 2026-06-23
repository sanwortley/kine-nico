'use server';

import { prisma } from '@/lib/db';

export async function getServices() {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    return { success: true, services };
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
    await prisma.service.create({ data: { name, description: description || null, price, duration } });
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
    await prisma.service.update({ where: { id }, data: { name, description: description || null, price, duration } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateService', error);
    return { success: false, error: 'Error al actualizar servicio' };
  }
}

export async function toggleServiceActive(id: string, currentActive: boolean) {
  try {
    await prisma.service.update({ where: { id }, data: { active: !currentActive } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleServiceActive', error);
    return { success: false, error: 'Error' };
  }
}

export async function deleteService(id: string) {
  try {
    await prisma.turno.deleteMany({ where: { serviceId: id } });
    await prisma.service.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteService', error);
    return { success: false, error: 'No se pudo eliminar el servicio' };
  }
}