import { PrismaClient } from "@prisma/client";

// Standard Next.js pattern: in dev, Next.js hot-reloads your code on every
// save, which would otherwise create a brand new PrismaClient (and a new
// DB connection) on every single edit. Stashing it on `globalThis` means
// we reuse the same client across reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
