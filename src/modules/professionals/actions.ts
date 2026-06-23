'use server';

import { prisma } from '@/lib/db';

export async function getProfessionals() {
  try {
    const professionals = await prisma.professional.findMany({
      include: { service: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, professionals };
  } catch (error: any) {
    console.error('Error in getProfessionals', error);
    return { success: false, error: 'Error al obtener profesionales' };
  }
}

export async function createProfessional(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const serviceId = formData.get('serviceId') as string;
    if (!name || !serviceId) return { success: false, error: 'El nombre y el servicio asociado son requeridos' };

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { success: false, error: 'Servicio asociado no encontrado' };

    await prisma.professional.create({
      data: { name, specialty: service.name, email: email || null, serviceId },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in createProfessional', error);
    return { success: false, error: 'Error al crear profesional' };
  }
}

export async function updateProfessional(id: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const specialty = formData.get('specialty') as string;
    const email = formData.get('email') as string;
    if (!name || !specialty) return { success: false, error: 'Nombre y especialidad requeridos' };
    await prisma.professional.update({ where: { id }, data: { name, specialty, email: email || null } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateProfessional', error);
    return { success: false, error: 'Error al actualizar profesional' };
  }
}

export async function toggleProfessionalActive(id: string) {
  try {
    const prof = await prisma.professional.findUnique({ where: { id } });
    if (!prof) return { success: false, error: 'Profesional no encontrado' };
    await prisma.professional.update({ where: { id }, data: { active: !prof.active } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleProfessionalActive', error);
    return { success: false, error: 'Error al cambiar estado' };
  }
}

export async function deleteProfessional(id: string) {
  try {
    await prisma.turno.deleteMany({ where: { professionalId: id } });
    await prisma.professional.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteProfessional', error);
    return { success: false, error: 'No se pudo eliminar el profesional' };
  }
}