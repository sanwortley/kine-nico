import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { FEATURE_FLAGS } from './lib/flags';
import { getMockDb } from './lib/mockDb';
import { prisma } from './lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña requeridos');
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        let user = null;

        if (FEATURE_FLAGS.USE_MOCK_DATA) {
          const db = getMockDb();
          user = db.users.find((u) => u.email.toLowerCase() === email);
        } else {
          user = await prisma.user.findUnique({
            where: { email },
          });
        }

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        // Verify password (mock check vs real)
        const passwordValid = await bcrypt.compare(
          password,
          user.hashedPassword || ''
        );
        if (!passwordValid) {
          throw new Error('Contraseña incorrecta');
        }

        // Check account status
        if (user.status === 'PENDING') {
          throw new Error('Tu cuenta está registrada pero requiere verificar el correo.');
        }
        if (user.status === 'EMAIL_VERIFIED') {
          throw new Error('Tu correo fue verificado. Espera la aprobación del administrador.');
        }
        if (user.status === 'REJECTED') {
          throw new Error('Tu solicitud de cuenta ha sido rechazada por el administrador.');
        }
        if (user.status === 'SUSPENDED') {
          throw new Error('Tu cuenta está suspendida temporalmente.');
        }
        if (user.status !== 'ACTIVE') {
          throw new Error('Estado de cuenta no válido para iniciar sesión.');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).status = token.status as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-key-njk-management-app-2026',
});
