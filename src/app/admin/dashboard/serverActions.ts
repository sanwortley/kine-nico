'use server';

import { getSession } from '@/lib/session';
import { getAllUsers, updateAccountStatus, toggleUserRole, adminCreateUser, deleteUser, changeUserPassword, logoutUser } from '@/modules/auth/actions';
import { getServices, createService, toggleServiceActive, deleteService } from '@/modules/services-offered/actions';
import { getProfessionals, createProfessional, toggleProfessionalActive, deleteProfessional } from '@/modules/professionals/actions';
import { getTurnos, createTurnoAvailability, cancelTurno, completeTurno, deleteTurno } from '@/modules/turnos/actions';

export async function saChangeStatus(userId: string, status: string) {
  return await updateAccountStatus(userId, status as any);
}

export async function saToggleRole(userId: string, currentRole: string) {
  return await toggleUserRole(userId, currentRole as any);
}

export async function saCreateUser(formData: FormData) {
  return await adminCreateUser(formData);
}

export async function saDeleteUser(id: string) {
  return await deleteUser(id);
}

export async function saAddService(formData: FormData) {
  return await createService(formData);
}

export async function saToggleService(id: string, active: boolean) {
  return await toggleServiceActive(id, active);
}

export async function saDeleteService(id: string) {
  return await deleteService(id);
}

export async function saAddProfessional(formData: FormData) {
  return await createProfessional(formData);
}

export async function saToggleProfessional(id: string) {
  return await toggleProfessionalActive(id);
}

export async function saDeleteProfessional(id: string) {
  return await deleteProfessional(id);
}

export async function saAddAvailability(formData: FormData) {
  const admin = await getSession();
  if (!admin) return { success: false, error: 'No autorizado' };
  return await createTurnoAvailability(formData, admin.id);
}

export async function saCancelAppointment(id: string) {
  return await cancelTurno(id, 'ADMIN');
}

export async function saCompleteAppointment(id: string) {
  return await completeTurno(id);
}

export async function saDeleteTurno(id: string) {
  return await deleteTurno(id);
}

export async function saChangePassword(formData: FormData) {
  const admin = await getSession();
  if (!admin) return { success: false, error: 'No autorizado' };
  return await changeUserPassword(formData, admin.id);
}

export async function saLogout() {
  await logoutUser();
  return { success: true };
}
