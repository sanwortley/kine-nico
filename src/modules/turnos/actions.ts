'use server';

import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, Turno, TurnoState } from '@/lib/mockDb';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

/**
 * Fetch appointments with full relations (Service, Professional, Client)
 */
export async function getTurnos() {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      // Resolve relations manually for mock data
      const resolvedTurnos = db.turnos.map((t: any) => {
        const service = db.services.find((s: any) => s.id === t.serviceId);
        const professional = db.professionals.find((p: any) => p.id === t.professionalId);
        const client = db.users.find((u: any) => u.id === t.clientId);
        
        return {
          ...t,
          service,
          professional,
          client: client ? { id: client.id, name: client.name, email: client.email } : null,
        };
      });

      return { success: true, turnos: resolvedTurnos };
    } else {
      const turnos = await prisma.turno.findMany({
        include: {
          service: true,
          professional: true,
          client: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { fechaInicio: 'asc' },
      });
      return { success: true, turnos };
    }
  } catch (error: any) {
    console.error('Error in getTurnos', error);
    return { success: false, error: 'Error al obtener turnos' };
  }
}

/**
 * Create a new available slot (Admin action)
 */
export async function createTurnoAvailability(formData: FormData, createdById: string) {
  try {
    const serviceId = formData.get('serviceId') as string;
    const professionalId = formData.get('professionalId') as string;
    const creationType = formData.get('creationType') as string || 'individual';

    if (!serviceId || !professionalId) {
      return { success: false, error: 'Servicio y profesional son requeridos' };
    }

    let duracion = 60;
    
    // Fetch duration first
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const service = db.services.find((s: any) => s.id === serviceId);
      if (!service) return { success: false, error: 'Servicio no encontrado' };
      duracion = service.duration;
    } else {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) return { success: false, error: 'Servicio no encontrado' };
      duracion = service.duration;
    }

    // Determine target slot dates
    let generatedTimes: Date[] = [];

    if (creationType === 'individual') {
      const fechaInicioStr = formData.get('fechaInicio') as string;
      if (!fechaInicioStr) {
        return { success: false, error: 'La fecha y hora es requerida para turnos individuales' };
      }
      const fechaInicio = new Date(fechaInicioStr);
      if (fechaInicio < new Date()) {
        return { success: false, error: 'No se pueden crear turnos en el pasado' };
      }
      generatedTimes.push(fechaInicio);
    } else {
      const rangeDate = formData.get('rangeDate') as string;
      const rangeStart = formData.get('rangeStart') as string;
      const rangeEnd = formData.get('rangeEnd') as string;

      if (!rangeDate || !rangeStart || !rangeEnd) {
        return { success: false, error: 'Fecha, hora de inicio y hora de fin son requeridas para lapsos de tiempo' };
      }

      const startDateTime = new Date(`${rangeDate}T${rangeStart.padStart(5, '0')}:00`);
      const endDateTime = new Date(`${rangeDate}T${rangeEnd.padStart(5, '0')}:00`);

      if (startDateTime >= endDateTime) {
        return { success: false, error: 'La hora de inicio debe ser anterior a la hora de fin' };
      }
      if (startDateTime < new Date()) {
        return { success: false, error: 'No se pueden crear turnos en el pasado' };
      }

      let current = new Date(startDateTime.getTime());
      while (current.getTime() + duracion * 60 * 1000 <= endDateTime.getTime()) {
        generatedTimes.push(new Date(current.getTime()));
        current.setTime(current.getTime() + duracion * 60 * 1000);
      }

      if (generatedTimes.length === 0) {
        return { success: false, error: `El lapso seleccionado es menor a la duración del servicio (${duracion} min)` };
      }
    }

    let insertedCount = 0;
    let skippedCount = 0;

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const existingTurnos = db.turnos.filter(t => t.professionalId === professionalId && t.estado !== 'CANCELADO');
      const slotsToInsert = [];

      for (const time of generatedTimes) {
        const duplicate = existingTurnos.some(t => new Date(t.fechaInicio).getTime() === time.getTime());
        if (duplicate) {
          skippedCount++;
        } else {
          slotsToInsert.push({
            id: 'turno_' + Math.random().toString(36).substring(7),
            fechaInicio: time.toISOString(),
            duracion,
            estado: 'DISPONIBLE' as TurnoState,
            serviceId,
            professionalId,
            createdById,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 0,
          });
        }
      }

      if (slotsToInsert.length === 0) {
        return { success: false, error: 'No se pudo crear ningún turno (superposición con turnos existentes)' };
      }

      db.turnos.push(...slotsToInsert);
      saveMockDb(db);
      insertedCount = slotsToInsert.length;
    } else {
      const existingTurnos = await prisma.turno.findMany({
        where: {
          professionalId,
          estado: { not: 'CANCELADO' },
          fechaInicio: {
            in: generatedTimes
          }
        }
      });

      const slotsToInsert = [];

      for (const time of generatedTimes) {
        const duplicate = existingTurnos.some((t: any) => t.fechaInicio.getTime() === time.getTime());
        if (duplicate) {
          skippedCount++;
        } else {
          slotsToInsert.push({
            fechaInicio: time,
            duracion,
            estado: 'DISPONIBLE' as any,
            serviceId,
            professionalId,
            createdById,
          });
        }
      }

      if (slotsToInsert.length === 0) {
        return { success: false, error: 'No se pudo crear ningún turno (superposición con turnos existentes)' };
      }

      await prisma.turno.createMany({
        data: slotsToInsert
      });
      insertedCount = slotsToInsert.length;
    }

    const msg = creationType === 'range' 
      ? `Se crearon ${insertedCount} turnos exitosamente (omitidos: ${skippedCount}).` 
      : 'Turno de disponibilidad creado con éxito.';

    return { success: true, message: msg };
  } catch (error: any) {
    console.error('Error in createTurnoAvailability', error);
    return { success: false, error: 'Error al crear la disponibilidad de turnos' };
  }
}

/**
 * Reserve an available slot (Client booking with optimistic locking concurrency control)
 */
export async function reserveTurno(turnoId: string, clientId: string, notes?: string) {
  try {
    let clientEmail = '';
    let clientName = '';
    let srvName = '';
    let profName = '';
    let dateStr = '';

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const turno = db.turnos.find(t => t.id === turnoId);
      
      if (!turno) {
        return { success: false, error: 'El turno ya no está disponible' };
      }
      
      if (turno.estado !== 'DISPONIBLE') {
        return { success: false, error: 'Este turno ya ha sido reservado por otra persona' };
      }

      const client = db.users.find(u => u.id === clientId);
      if (!client) return { success: false, error: 'Usuario no encontrado' };
      if (client.status !== 'ACTIVE') {
        return { success: false, error: 'Su cuenta no se encuentra activa para operar' };
      }

      const service = db.services.find(s => s.id === turno.serviceId);
      const professional = db.professionals.find(p => p.id === turno.professionalId);

      // Perform atomic update in Javascript event loop
      turno.estado = 'RESERVADO';
      turno.clientId = clientId;
      turno.notas = notes;
      turno.version += 1;
      turno.updatedAt = new Date().toISOString();
      
      saveMockDb(db);

      clientEmail = client.email;
      clientName = client.name;
      srvName = service?.name || '';
      profName = professional?.name || '';
      dateStr = new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
    } else {
      // Prisma TRANSACTION with check to ensure double-booking prevention
      const result = await prisma.$transaction(async (tx: any) => {
        // Find user status
        const client = await tx.user.findUnique({ where: { id: clientId } });
        if (!client || client.status !== 'ACTIVE') {
          throw new Error('Su cuenta no está autorizada para reservar');
        }

        // Fetch turno and check it is still available
        const turno = await tx.turno.findUnique({
          where: { id: turnoId },
          include: { service: true, professional: true }
        });

        if (!turno || turno.estado !== 'DISPONIBLE') {
          throw new Error('Este turno ya ha sido reservado por otra persona');
        }

        // Update with optimistic where condition check
        const updated = await tx.turno.updateMany({
          where: {
            id: turnoId,
            estado: 'DISPONIBLE',
            version: turno.version,
          },
          data: {
            estado: 'RESERVADO',
            clientId,
            notas: notes || null,
            version: { increment: 1 }
          }
        });

        if (updated.count === 0) {
          throw new Error('Conflicto de reserva: el turno acaba de ser reservado por otro paciente');
        }

        return {
          clientEmail: client.email,
          clientName: client.name,
          srvName: turno.service.name,
          profName: turno.professional.name,
          dateStr: new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' })
        };
      });

      clientEmail = result.clientEmail;
      clientName = result.clientName;
      srvName = result.srvName;
      profName = result.profName;
      dateStr = result.dateStr;
    }

    // Send confirmation email
    await sendEmail({
      to: clientEmail,
      subject: 'NJK - Confirmación de Reserva de Turno',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #27AE60;">¡Turno Reservado con Éxito!</h2>
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Te confirmamos que reservaste el siguiente turno:</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Servicio:</strong> ${srvName}</li>
            <li><strong>Profesional:</strong> ${profName}</li>
            <li><strong>Fecha y Hora:</strong> ${dateStr}</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 13px; color: #666;">Si necesitas cancelar o reprogramar, recordá hacerlo con al menos 24 horas de anticipación desde el portal de pacientes.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in reserveTurno', error);
    return { success: false, error: error.message || 'Error al reservar el turno' };
  }
}

/**
 * Cancel a booking
 */
export async function cancelTurno(turnoId: string, role: string) {
  try {
    let clientEmail = '';
    let clientName = '';
    let srvName = '';
    let dateStr = '';

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const turno = db.turnos.find(t => t.id === turnoId);
      if (!turno) return { success: false, error: 'Turno no encontrado' };

      const client = db.users.find(u => u.id === turno.clientId);
      const service = db.services.find(s => s.id === turno.serviceId);

      // If client cancels, check 24h limit
      if (role === 'CLIENT' && turno.fechaInicio) {
        const limit = new Date(turno.fechaInicio).getTime() - 24 * 60 * 60 * 1000;
        if (Date.now() > limit) {
          return { success: false, error: 'Los turnos solo pueden cancelarse con al menos 24 horas de anticipación.' };
        }
      }

      // If it's a client booking, reset it to DISPONIBLE (so others can book it) or set to CANCELLED.
      // Usually, if the admin cancels a slot, it goes to CANCELLED. If a client cancels, the slot goes back to DISPONIBLE.
      if (role === 'CLIENT') {
        turno.estado = 'DISPONIBLE';
        turno.clientId = undefined;
        turno.notas = undefined;
      } else {
        turno.estado = 'CANCELADO';
      }
      
      turno.version += 1;
      turno.updatedAt = new Date().toISOString();
      saveMockDb(db);

      if (client) {
        clientEmail = client.email;
        clientName = client.name;
        srvName = service?.name || '';
        dateStr = new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
      }
    } else {
      const turno = await prisma.turno.findUnique({
        where: { id: turnoId },
        include: { client: true, service: true }
      });

      if (!turno) return { success: false, error: 'Turno no encontrado' };

      if (role === 'CLIENT') {
        const limit = new Date(turno.fechaInicio).getTime() - 24 * 60 * 60 * 1000;
        if (Date.now() > limit) {
          return { success: false, error: 'Los turnos solo pueden cancelarse con al menos 24 horas de anticipación.' };
        }

        await prisma.turno.update({
          where: { id: turnoId },
          data: {
            estado: 'DISPONIBLE',
            clientId: null,
            notas: null,
            version: { increment: 1 }
          }
        });
      } else {
        await prisma.turno.update({
          where: { id: turnoId },
          data: {
            estado: 'CANCELADO',
            version: { increment: 1 }
          }
        });
      }

      if (turno.client) {
        clientEmail = turno.client.email;
        clientName = turno.client.name;
        srvName = turno.service.name;
        dateStr = new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
      }
    }

    // Send cancellation email if it was booked
    if (clientEmail) {
      await sendEmail({
        to: clientEmail,
        subject: 'NJK - Cancelación de Turno',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0A3D62;">Turno Cancelado</h2>
            <p>Hola <strong>${clientName}</strong>,</p>
            <p>Te notificamos que el turno de <strong>${srvName}</strong> reservado para el <strong>${dateStr}</strong> ha sido cancelado.</p>
            <p>Podés ingresar al portal para buscar una nueva fecha.</p>
          </div>
        `,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in cancelTurno', error);
    return { success: false, error: 'Error al cancelar el turno' };
  }
}

/**
 * Complete an appointment (Admin action)
 */
export async function completeTurno(turnoId: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const turno = db.turnos.find(t => t.id === turnoId);
      if (!turno) return { success: false, error: 'Turno no encontrado' };
      turno.estado = 'COMPLETADO';
      turno.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      await prisma.turno.update({
        where: { id: turnoId },
        data: { estado: 'COMPLETADO' }
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in completeTurno', error);
    return { success: false, error: 'Error' };
  }
}

export async function deleteTurno(turnoId: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const index = db.turnos.findIndex(t => t.id === turnoId);
      if (index === -1) return { success: false, error: 'Turno no encontrado' };
      db.turnos.splice(index, 1);
      saveMockDb(db);
    } else {
      await prisma.turno.delete({ where: { id: turnoId } });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteTurno', error);
    return { success: false, error: 'No se pudo eliminar el turno' };
  }
}
