import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy initialization of Prisma Client using a Proxy.
// This prevents initialization errors during build-time evaluation when using Mock data.
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop);
  }
});
