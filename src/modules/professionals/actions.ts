'use server';

import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, Professional } from '@/lib/mockDb';
import { prisma } from '@/lib/db';

export async function getProfessionals() {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const resolved = db.professionals.map(p => {
        const service = db.services.find(s => s.id === p.serviceId);
        return {
          ...p,
          service
        };
      });
      return { success: true, professionals: resolved };
    } else {
      const professionals = await prisma.professional.findMany({
        include: { service: true },
        orderBy: { name: 'asc' },
      });
      return { success: true, professionals };
    }
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

    if (!name || !serviceId) {
      return { success: false, error: 'El nombre y el servicio asociado son requeridos' };
    }

    const now = new Date().toISOString();
    let specialty = 'Kinesiología';

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      
      // Verify service exists
      const service = db.services.find(s => s.id === serviceId);
      if (!service) return { success: false, error: 'Servicio asociado no encontrado' };
      specialty = service.name;

      const newProf: Professional = {
        id: 'prof_' + Math.random().toString(36).substring(7),
        name,
        specialty,
        email: email || undefined,
        active: true,
        serviceId,
        createdAt: now,
        updatedAt: now,
      };
      db.professionals.push(newProf);
      saveMockDb(db);
    } else {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) return { success: false, error: 'Servicio asociado no encontrado' };
      specialty = service.name;

      await prisma.professional.create({
        data: { 
          name, 
          specialty, 
          email: email || null,
          serviceId
        },
      });
    }

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

    if (!name || !specialty) {
      return { success: false, error: 'Nombre y especialidad requeridos' };
    }

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const prof = db.professionals.find(p => p.id === id);
      if (!prof) return { success: false, error: 'Profesional no encontrado' };
      prof.name = name;
      prof.specialty = specialty;
      prof.email = email || undefined;
      prof.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      await prisma.professional.update({
        where: { id },
        data: { name, specialty, email: email || null },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateProfessional', error);
    return { success: false, error: 'Error al actualizar profesional' };
  }
}

export async function toggleProfessionalActive(id: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const prof = db.professionals.find(p => p.id === id);
      if (!prof) return { success: false, error: 'Profesional no encontrado' };
      prof.active = !prof.active;
      prof.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      const prof = await prisma.professional.findUnique({ where: { id } });
      if (!prof) return { success: false, error: 'Profesional no encontrado' };
      await prisma.professional.update({
        where: { id },
        data: { active: !prof.active },
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleProfessionalActive', error);
    return { success: false, error: 'Error al cambiar estado' };
  }
}
