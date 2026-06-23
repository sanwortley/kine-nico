'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createSession, destroySession } from '@/lib/session';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function adminCreateUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string || '').toLowerCase().trim();
    const name = formData.get('name') as string || '';
    const role = (formData.get('role') as string || 'CLIENT') as 'ADMIN' | 'CLIENT' | 'PROFESSIONAL';
    const provisionalPassword = formData.get('provisionalPassword') as string || '';

    if (!email || !name || !provisionalPassword) {
      return { success: false, error: 'Nombre, email y contraseña provisional son obligatorios' };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: 'El email ya está registrado' };

    const hashedPassword = await bcrypt.hash(provisionalPassword, 10);

    let createdUser;
    if (role === 'PROFESSIONAL') {
      const firstService = await prisma.service.findFirst();
      if (!firstService) {
        return { success: false, error: 'Debe crear al menos un servicio antes de registrar a un profesional.' };
      }
      createdUser = await prisma.user.create({
        data: { email, hashedPassword, name, role, status: 'PENDING' },
      });
      await prisma.professional.create({
        data: { name, specialty: 'Kinesiología / Especialidad médica', email, active: true, serviceId: firstService.id },
      });
    } else {
      createdUser = await prisma.user.create({
        data: { email, hashedPassword, name, role, status: 'PENDING' },
      });
    }

    const verifyLink = `${BASE_URL}/auth/verify?id=${createdUser.id}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: 'NJK - Tu cuenta ha sido creada',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0A3D62;">¡Tu cuenta ha sido creada!</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>El administrador ha creado tu cuenta en el Centro de Kinesiología y Entrenamiento Deportivo NJK.</p>
          <p>Tus credenciales provisionales son:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Contraseña Provisional:</strong> ${provisionalPassword}</li>
          </ul>
          <p style="color: #d97706; font-weight: bold; margin-top: 20px;">⚠️ IMPORTANTE: Por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
          <p style="margin: 20px 0;">
            <a href="${verifyLink}" style="background-color: #27AE60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verificar Mi Correo</a>
          </p>
          <p>Una vez que inicies sesión, te recomendamos cambiar la contraseña provisional desde la sección de configuración de tu panel.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in adminCreateUser', error);
    return { success: false, error: error.message || 'Error al crear el usuario' };
  }
}

export async function verifyEmail(id: string, email: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id }, { email: email.toLowerCase().trim() }] },
    });
    if (!user) return { success: false, error: 'Usuario no encontrado' };
    if (user.status === 'PENDING') {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'EMAIL_VERIFIED' } });
    }
    return { success: true, status: 'EMAIL_VERIFIED' };
  } catch (error: any) {
    console.error('Error in verifyEmail', error);
    return { success: false, error: error.message || 'Error en el servidor' };
  }
}

export async function updateAccountStatus(userId: string, newStatus: 'PENDING' | 'EMAIL_VERIFIED' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED') {
  try {
    const user = await prisma.user.update({ where: { id: userId }, data: { status: newStatus } });
    if (newStatus === 'ACTIVE') {
      await sendEmail({
        to: user.email,
        subject: 'NJK - ¡Tu cuenta ha sido activada!',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0A3D62;">¡Tu cuenta ya está activa!</h2>
            <p>Hola <strong>${user.name}</strong>,</p>
            <p>El administrador ha activado y aprobado tu cuenta en el Centro de Kinesiología y Entrenamiento Deportivo NJK.</p>
            <p>Ya podés operar normalmente y reservar tus turnos en el portal.</p>
          </div>
        `,
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateAccountStatus', error);
    return { success: false, error: error.message || 'Error en el servidor' };
  }
}

export async function toggleUserRole(userId: string, currentRole: string) {
  try {
    const newRole = currentRole === 'ADMIN' ? 'CLIENT' : 'ADMIN';
    await prisma.user.update({ where: { id: userId }, data: { role: newRole as any } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleUserRole', error);
    return { success: false, error: error.message || 'Error' };
  }
}

export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, users };
  } catch (error: any) {
    console.error('Error in getAllUsers', error);
    return { success: false, error: 'Error al obtener usuarios' };
  }
}

export async function loginUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string || '').toLowerCase().trim();
    const password = formData.get('password') as string || '';
    if (!email || !password) return { success: false, error: 'Email y contraseña requeridos' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: 'Usuario no encontrado' };

    const passwordValid = await bcrypt.compare(password, user.hashedPassword || '');
    if (!passwordValid) return { success: false, error: 'Contraseña incorrecta' };

    if (user.status === 'REJECTED') return { success: false, error: 'Tu cuenta ha sido rechazada por el administrador.' };
    if (user.status === 'SUSPENDED') return { success: false, error: 'Tu cuenta está suspendida temporalmente.' };

    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
    return { success: true, role: user.role };
  } catch (error: any) {
    console.error('Error in loginUser', error);
    return { success: false, error: error.message || 'Error en el servidor' };
  }
}

export async function logoutUser() {
  await destroySession();
  return { success: true };
}

export async function changeUserPassword(formData: FormData, userId: string) {
  try {
    const currentPassword = formData.get('currentPassword') as string || '';
    const newPassword = formData.get('newPassword') as string || '';
    if (!currentPassword || !newPassword) return { success: false, error: 'Ambas contraseñas son obligatorias.' };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: 'Usuario no encontrado' };

    const currentValid = await bcrypt.compare(currentPassword, user.hashedPassword || '');
    if (!currentValid) return { success: false, error: 'Contraseña actual incorrecta' };

    await prisma.user.update({ where: { id: userId }, data: { hashedPassword: await bcrypt.hash(newPassword, 10) } });
    return { success: true };
  } catch (error: any) {
    console.error('Error in changeUserPassword', error);
    return { success: false, error: error.message || 'Error al cambiar contraseña' };
  }
}

export async function deleteUser(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { success: false, error: 'Usuario no encontrado' };

    await prisma.$transaction([
      // Liberar turnos reservados por este usuario (vuelven a DISPONIBLE)
      prisma.turno.updateMany({
        where: { clientId: id },
        data: { clientId: null, subscriptionId: null, estado: 'DISPONIBLE', notas: null },
      }),
      // Eliminar turnos creados por este usuario (solo si es admin/prof)
      prisma.turno.deleteMany({ where: { createdById: id } }),
      // Eliminar suscripciones
      prisma.subscription.deleteMany({ where: { userId: id } }),
      // Eliminar registro professional si corresponde
      ...(user.role === 'PROFESSIONAL'
        ? [prisma.professional.deleteMany({ where: { email: user.email } })]
        : []),
      // Eliminar usuario
      prisma.user.delete({ where: { id } }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUser', error);
    return { success: false, error: 'No se pudo eliminar el usuario' };
  }
}