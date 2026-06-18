'use server';

import bcrypt from 'bcryptjs';
import { FEATURE_FLAGS } from '@/lib/flags';
import { getMockDb, saveMockDb, User, AccountStatus, Role } from '@/lib/mockDb';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createSession, destroySession } from '@/lib/session';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * Admin action to create a new user (with provisional password)
 */
export async function adminCreateUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string || '').toLowerCase().trim();
    const name = formData.get('name') as string || '';
    const role = formData.get('role') as Role || 'CLIENT';
    const provisionalPassword = formData.get('provisionalPassword') as string || '';

    if (!email || !name || !provisionalPassword) {
      return { success: false, error: 'Nombre, email y contraseña provisional son obligatorios' };
    }

    const hashedPassword = await bcrypt.hash(provisionalPassword, 10);
    const userId = 'usr_' + Math.random().toString(36).substring(7);
    const now = new Date().toISOString();

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      if (db.users.some(u => u.email.toLowerCase() === email)) {
        return { success: false, error: 'El email ya está registrado' };
      }

      const newUser: User = {
        id: userId,
        email,
        hashedPassword,
        name,
        role,
        status: 'PENDING', // Initial state: pending email verification
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(newUser);

      if (role === 'PROFESSIONAL') {
        const defaultServiceId = db.services[0]?.id || 'srv-1';
        db.professionals.push({
          id: 'prof_' + Math.random().toString(36).substring(7),
          name,
          specialty: 'Kinesiología / Especialidad médica', // Default placeholder specialty
          email,
          active: true,
          serviceId: defaultServiceId,
          createdAt: now,
          updatedAt: now,
        });
      }

      saveMockDb(db);
    } else {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { success: false, error: 'El email ya está registrado' };
      }

      if (role === 'PROFESSIONAL') {
        const firstService = await prisma.service.findFirst();
        if (!firstService) {
          return { success: false, error: 'Debe crear al menos un servicio antes de registrar a un profesional.' };
        }
        
        await prisma.user.create({
          data: {
            email,
            hashedPassword,
            name,
            role,
            status: 'PENDING',
          }
        });

        await prisma.professional.create({
          data: {
            name,
            specialty: 'Kinesiología / Especialidad médica',
            email,
            active: true,
            serviceId: firstService.id
          }
        });
      } else {
        await prisma.user.create({
          data: {
            email,
            hashedPassword,
            name,
            role,
            status: 'PENDING',
          }
        });
      }
    }

    // Send email verification link
    const verifyLink = `${BASE_URL}/auth/verify?id=${userId}&email=${encodeURIComponent(email)}`;
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

/**
 * Verify user email
 */
export async function verifyEmail(id: string, email: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const userIndex = db.users.findIndex(
        u => u.id === id || u.email.toLowerCase() === email.toLowerCase()
      );

      if (userIndex === -1) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = db.users[userIndex];
      if (user.status === 'PENDING') {
        user.status = 'EMAIL_VERIFIED';
        user.updatedAt = new Date().toISOString();
        saveMockDb(db);
      }
      return { success: true, status: user.status };
    } else {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id }, { email: email.toLowerCase().trim() }],
        },
      });

      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      if (user.status === 'PENDING') {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'EMAIL_VERIFIED' },
        });
      }
      return { success: true, status: 'EMAIL_VERIFIED' };
    }
  } catch (error: any) {
    console.error('Error in verifyEmail', error);
    return { success: false, error: error.message || 'Error en el servidor' };
  }
}

/**
 * Admin action to change account status (approve, suspend, reject)
 */
export async function updateAccountStatus(userId: string, newStatus: AccountStatus) {
  try {
    let updatedUserEmail = '';
    let updatedUserName = '';

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const user = db.users.find(u => u.id === userId);
      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      user.status = newStatus;
      user.updatedAt = new Date().toISOString();
      saveMockDb(db);
      updatedUserEmail = user.email;
      updatedUserName = user.name;
    } else {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
      updatedUserEmail = user.email;
      updatedUserName = user.name;
    }

    // Send notifications on approval/activation
    if (newStatus === 'ACTIVE') {
      await sendEmail({
        to: updatedUserEmail,
        subject: 'NJK - ¡Tu cuenta ha sido activada!',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0A3D62;">¡Tu cuenta ya está activa!</h2>
            <p>Hola <strong>${updatedUserName}</strong>,</p>
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

/**
 * Admin action to toggle role between CLIENT and ADMIN
 */
export async function toggleUserRole(userId: string, currentRole: Role) {
  try {
    const newRole = currentRole === 'ADMIN' ? 'CLIENT' : 'ADMIN';

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const user = db.users.find(u => u.id === userId);
      if (!user) return { success: false, error: 'Usuario no encontrado' };
      user.role = newRole;
      user.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in toggleUserRole', error);
    return { success: false, error: error.message || 'Error' };
  }
}

/**
 * Fetch all users (for admin panel)
 */
export async function getAllUsers() {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      return { success: true, users: getMockDb().users };
    } else {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, users };
    }
  } catch (error: any) {
    console.error('Error in getAllUsers', error);
    return { success: false, error: 'Error al obtener usuarios' };
  }
}

/**
 * Log in a user (handles credentials authentication and sets session cookies)
 */
export async function loginUser(formData: FormData) {
  try {
    const email = (formData.get('email') as string || '').toLowerCase().trim();
    const password = formData.get('password') as string || '';

    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    let user = null;

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      user = db.users.find(u => u.email.toLowerCase() === email);
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const passwordValid = await bcrypt.compare(password, user.hashedPassword || '');
    if (!passwordValid) {
      return { success: false, error: 'Contraseña incorrecta' };
    }

    // Check account status restrictions
    if (user.status === 'REJECTED') {
      return { success: false, error: 'Tu cuenta ha sido rechazada por el administrador.' };
    }
    if (user.status === 'SUSPENDED') {
      return { success: false, error: 'Tu cuenta está suspendida temporalmente.' };
    }

    // Create session cookie (allows login for PENDING, EMAIL_VERIFIED, and ACTIVE)
    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });

    return { success: true, role: user.role };
  } catch (error: any) {
    console.error('Error in loginUser', error);
    return { success: false, error: error.message || 'Error en el servidor' };
  }
}

/**
 * Log out user (clears cookies)
 */
export async function logoutUser() {
  await destroySession();
  return { success: true };
}

/**
 * Change user password (from Settings panel)
 */
export async function changeUserPassword(formData: FormData, userId: string) {
  try {
    const currentPassword = formData.get('currentPassword') as string || '';
    const newPassword = formData.get('newPassword') as string || '';

    if (!currentPassword || !newPassword) {
      return { success: false, error: 'Ambas contraseñas son obligatorias.' };
    }

    let user = null;

    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      user = db.users.find(u => u.id === userId);
      if (!user) return { success: false, error: 'Usuario no encontrado' };

      const currentValid = await bcrypt.compare(currentPassword, user.hashedPassword || '');
      if (!currentValid) return { success: false, error: 'Contraseña actual incorrecta' };

      user.hashedPassword = await bcrypt.hash(newPassword, 10);
      user.updatedAt = new Date().toISOString();
      saveMockDb(db);
    } else {
      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, error: 'Usuario no encontrado' };

      const currentValid = await bcrypt.compare(currentPassword, user.hashedPassword || '');
      if (!currentValid) return { success: false, error: 'Contraseña actual incorrecta' };

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword: hashedNew }
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in changeUserPassword', error);
    return { success: false, error: error.message || 'Error al cambiar contraseña' };
  }
}

export async function deleteUser(id: string) {
  try {
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      const db = getMockDb();
      const index = db.users.findIndex(u => u.id === id);
      if (index === -1) return { success: false, error: 'Usuario no encontrado' };
      const email = db.users[index].email;
      db.professionals = db.professionals.filter(p => p.email !== email);
      db.users.splice(index, 1);
      saveMockDb(db);
    } else {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        if (user.role === 'PROFESSIONAL') {
          await prisma.professional.deleteMany({ where: { email: user.email } });
        }
        await prisma.user.delete({ where: { id } });
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteUser', error);
    return { success: false, error: 'No se pudo eliminar el usuario' };
  }
}
