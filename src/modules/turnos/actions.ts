'use server';

import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function getTurnos() {
  try {
    const turnos = await prisma.turno.findMany({
      include: {
        service: true,
        professional: true,
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { fechaInicio: 'asc' },
    });
    return { success: true, turnos };
  } catch (error: any) {
    console.error('Error in getTurnos', error);
    return { success: false, error: 'Error al obtener turnos' };
  }
}

export async function createTurnoAvailability(formData: FormData, createdById: string) {
  try {
    const serviceId = formData.get('serviceId') as string;
    const professionalId = formData.get('professionalId') as string;
    const creationType = formData.get('creationType') as string || 'individual';
    if (!serviceId || !professionalId) return { success: false, error: 'Servicio y profesional son requeridos' };

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { success: false, error: 'Servicio no encontrado' };
    const duracion = service.duration;

    const generatedTimes: Date[] = [];

    if (creationType === 'individual') {
      const fechaInicioStr = formData.get('fechaInicio') as string;
      if (!fechaInicioStr) return { success: false, error: 'La fecha y hora es requerida para turnos individuales' };
      const fechaInicio = new Date(fechaInicioStr);
      if (fechaInicio < new Date()) return { success: false, error: 'No se pueden crear turnos en el pasado' };
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
      if (startDateTime >= endDateTime) return { success: false, error: 'La hora de inicio debe ser anterior a la hora de fin' };
      if (startDateTime < new Date()) return { success: false, error: 'No se pueden crear turnos en el pasado' };
      let current = new Date(startDateTime);
      while (current.getTime() + duracion * 60 * 1000 <= endDateTime.getTime()) {
        generatedTimes.push(new Date(current));
        current.setTime(current.getTime() + duracion * 60 * 1000);
      }
      if (generatedTimes.length === 0) {
        return { success: false, error: `El lapso seleccionado es menor a la duración del servicio (${duracion} min)` };
      }
    }

    const existingTurnos = await prisma.turno.findMany({
      where: { professionalId, estado: { not: 'CANCELADO' }, fechaInicio: { in: generatedTimes } },
    });
    const existingTimes = new Set(existingTurnos.map((t: any) => t.fechaInicio.getTime()));

    const slotsToInsert = generatedTimes
      .filter(t => !existingTimes.has(t.getTime()))
      .map(fechaInicio => ({ fechaInicio, duracion, estado: 'DISPONIBLE' as any, serviceId, professionalId, createdById }));

    const skippedCount = generatedTimes.length - slotsToInsert.length;
    if (slotsToInsert.length === 0) {
      return { success: false, error: 'No se pudo crear ningún turno (superposición con turnos existentes)' };
    }

    await prisma.turno.createMany({ data: slotsToInsert });

    const msg = creationType === 'range'
      ? `Se crearon ${slotsToInsert.length} turnos exitosamente (omitidos: ${skippedCount}).`
      : 'Turno de disponibilidad creado con éxito.';
    return { success: true, message: msg };
  } catch (error: any) {
    console.error('Error in createTurnoAvailability', error);
    return { success: false, error: 'Error al crear la disponibilidad de turnos' };
  }
}

export async function reserveTurno(turnoId: string, clientId: string, notes?: string) {
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const client = await tx.user.findUnique({ where: { id: clientId } });
      if (!client || client.status !== 'ACTIVE') throw new Error('Su cuenta no está autorizada para reservar');

      const turno = await tx.turno.findUnique({ where: { id: turnoId }, include: { service: true, professional: true } });
      if (!turno || turno.estado !== 'DISPONIBLE') throw new Error('Este turno ya ha sido reservado por otra persona');

      const updated = await tx.turno.updateMany({
        where: { id: turnoId, estado: 'DISPONIBLE', version: turno.version },
        data: { estado: 'RESERVADO', clientId, notas: notes || null, version: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error('Conflicto de reserva: el turno acaba de ser reservado por otro paciente');

      return {
        clientEmail: client.email,
        clientName: client.name,
        srvName: turno.service.name,
        profName: turno.professional.name,
        dateStr: new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' }),
      };
    });

    await sendEmail({
      to: result.clientEmail,
      subject: 'NJK - Confirmación de Reserva de Turno',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #27AE60;">¡Turno Reservado con Éxito!</h2>
          <p>Hola <strong>${result.clientName}</strong>,</p>
          <p>Te confirmamos que reservaste el siguiente turno:</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Servicio:</strong> ${result.srvName}</li>
            <li><strong>Profesional:</strong> ${result.profName}</li>
            <li><strong>Fecha y Hora:</strong> ${result.dateStr}</li>
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

export async function cancelTurno(turnoId: string, role: string) {
  try {
    const turno = await prisma.turno.findUnique({ where: { id: turnoId }, include: { client: true, service: true } });
    if (!turno) return { success: false, error: 'Turno no encontrado' };

    if (role === 'CLIENT') {
      const limit = new Date(turno.fechaInicio).getTime() - 24 * 60 * 60 * 1000;
      if (Date.now() > limit) {
        return { success: false, error: 'Los turnos solo pueden cancelarse con al menos 24 horas de anticipación.' };
      }
      await prisma.$transaction(async (tx: any) => {
        await tx.turno.update({
          where: { id: turnoId },
          data: { estado: 'DISPONIBLE', clientId: null, subscriptionId: null, notas: null, version: { increment: 1 } },
        });
        if (turno.subscriptionId) {
          await tx.subscription.update({
            where: { id: turno.subscriptionId },
            data: { turnosRestantes: { increment: 1 } },
          });
        }
      });
    } else {
      await prisma.turno.update({ where: { id: turnoId }, data: { estado: 'CANCELADO', version: { increment: 1 } } });
    }

    if (turno.client) {
      await sendEmail({
        to: turno.client.email,
        subject: 'NJK - Cancelación de Turno',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0A3D62;">Turno Cancelado</h2>
            <p>Hola <strong>${turno.client.name}</strong>,</p>
            <p>Te notificamos que el turno de <strong>${turno.service.name}</strong> reservado para el <strong>${new Date(turno.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' })}</strong> ha sido cancelado.</p>
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

export async function reserveMultipleTurnos(turnoIds: string[], clientId: string, notes?: string) {
  if (turnoIds.length === 0) return { success: false, error: 'No se seleccionaron turnos' };
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const client = await tx.user.findUnique({ where: { id: clientId } });
      if (!client || client.status !== 'ACTIVE') throw new Error('Su cuenta no está autorizada para reservar');

      const now = new Date();
      const sub = await tx.subscription.findFirst({
        where: { userId: clientId, estado: 'ACTIVE', OR: [{ fechaFin: null }, { fechaFin: { gt: now } }] },
        include: { plan: true },
      });
      if (!sub) throw new Error('No tenés una suscripción activa para realizar reservas múltiples');
      if (sub.turnosRestantes < turnoIds.length) {
        throw new Error(`Solo tenés ${sub.turnosRestantes} sesión/es disponibles. Seleccioná menos turnos.`);
      }

      const turnos = await tx.turno.findMany({
        where: { id: { in: turnoIds } },
        include: { service: true, professional: true },
      });
      const unavailable = turnos.filter((t: any) => t.estado !== 'DISPONIBLE');
      if (unavailable.length > 0) {
        throw new Error(`${unavailable.length} turno(s) ya no están disponibles. Actualizá la página e intentá de nuevo.`);
      }
      if (turnos.length !== turnoIds.length) throw new Error('Algunos turnos no fueron encontrados');

      for (const turno of turnos) {
        const updated = await tx.turno.updateMany({
          where: { id: turno.id, estado: 'DISPONIBLE', version: turno.version },
          data: { estado: 'RESERVADO', clientId, subscriptionId: sub.id, notas: notes ?? null, version: { increment: 1 } },
        });
        if (updated.count === 0) throw new Error('Conflicto de reserva: un turno acaba de ser tomado por otro paciente');
      }

      await tx.subscription.update({ where: { id: sub.id }, data: { turnosRestantes: { decrement: turnoIds.length } } });

      return {
        clientEmail: client.email,
        clientName: client.name,
        turnosRestantes: sub.turnosRestantes - turnoIds.length,
        bookedDetails: turnos.map((t: any) => ({
          srvName: t.service.name,
          profName: t.professional.name,
          dateStr: new Date(t.fechaInicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' }),
        })),
      };
    });

    await sendEmail({
      to: result.clientEmail,
      subject: `NJK - Confirmación de ${turnoIds.length} Turnos Reservados`,
      html: buildMultiBookEmail(result.clientName, result.bookedDetails, result.turnosRestantes),
    });
    return { success: true, turnosRestantes: result.turnosRestantes };
  } catch (error: any) {
    console.error('Error in reserveMultipleTurnos', error);
    return { success: false, error: error.message || 'Error al reservar los turnos' };
  }
}

function buildMultiBookEmail(
  clientName: string,
  slots: { srvName: string; profName: string; dateStr: string }[],
  turnosRestantes: number
) {
  const rows = slots.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
      <td style="padding:8px 12px">${s.dateStr}</td>
      <td style="padding:8px 12px">${s.srvName}</td>
      <td style="padding:8px 12px">${s.profName}</td>
    </tr>`).join('');

  return `
    <div style="font-family:sans-serif;padding:20px;color:#333">
      <h2 style="color:#27AE60">¡${slots.length} Turno(s) Reservados con Éxito!</h2>
      <p>Hola <strong>${clientName}</strong>,</p>
      <p>Confirmamos las siguientes reservas:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#0A3D62;color:#fff">
          <th style="padding:8px 12px;text-align:left">Fecha y Hora</th>
          <th style="padding:8px 12px;text-align:left">Servicio</th>
          <th style="padding:8px 12px;text-align:left">Profesional</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Te quedan <strong>${turnosRestantes}</strong> sesión/es disponibles en tu plan.</p>
      <p style="font-size:13px;color:#666">Para cancelar, recordá hacerlo con al menos 24 horas de anticipación desde el portal de pacientes.</p>
    </div>`;
}

export async function completeTurno(turnoId: string) {
  try {
    await prisma.turno.update({ where: { id: turnoId }, data: { estado: 'COMPLETADO' } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in completeTurno', error);
    return { success: false, error: 'Error' };
  }
}

export async function deleteTurno(turnoId: string) {
  try {
    await prisma.turno.delete({ where: { id: turnoId } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteTurno', error);
    return { success: false, error: 'No se pudo eliminar el turno' };
  }
}