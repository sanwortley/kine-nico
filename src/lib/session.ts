import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_COOKIE_NAME = 'njk_session_user';

export async function createSession(user: { id: string; name: string; email: string; role: string; status: string }) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return null;

  try {
    const parsed = JSON.parse(sessionCookie.value);
    const user = await prisma.user.findUnique({ where: { id: parsed.id } });

    if (!user || user.status === 'REJECTED' || user.status === 'SUSPENDED') {
      await destroySession();
      return null;
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}