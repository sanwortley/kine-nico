import { cache } from 'react';
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

// cache() deduplicates calls within the same server request — one DB query max per page load
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  try {
    const parsed = JSON.parse(sessionCookie.value);
    if (!parsed?.id) return null;

    try {
      const user = await prisma.user.findUnique({ where: { id: parsed.id } });
      if (!user || user.status === 'REJECTED' || user.status === 'SUSPENDED') {
        await destroySession();
        return null;
      }
      return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
    } catch {
      // DB unreachable — trust the cookie so the user can still navigate
      if (parsed.id && parsed.role && parsed.email) {
        return { id: parsed.id, name: parsed.name, email: parsed.email, role: parsed.role, status: parsed.status };
      }
      return null;
    }
  } catch {
    return null;
  }
});

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}