import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from './generated/prisma/client.js';

// BETTER_AUTH_URL is the public origin the browser sees (the frontend, which
// proxies /api to this backend), so cookies and origin checks match it.
export function createAuth(prisma: PrismaClient) {
  const origin = process.env.BETTER_AUTH_URL;
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
    trustedOrigins: origin ? [origin] : [],
    // Default rate-limit storage is memory, which does not work on serverless.
    rateLimit: { storage: 'database' },
  });
}

export type Auth = ReturnType<typeof createAuth>;
