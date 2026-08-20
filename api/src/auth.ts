import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from './db/client';
import * as authSchema from './db/schemas/auth.table';

export interface CreateAuthOptions {
  databaseUrl: string;
  secret?: string;
  baseURL?: string;
  trustedOrigins?: string[];
}

// In-memory cache across requests within the same Cloudflare Worker isolate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authCache = new Map<string, any>();

/**
 * Returns a cached BetterAuth instance per Worker isolate, creating one only when not yet initialized.
 */
export function getAuth(options: CreateAuthOptions) {
  const trustedOrigins = Array.from(
    new Set(['https://hoppscotch.io', ...(options.trustedOrigins || [])]),
  );

  const cacheKey = `${options.databaseUrl}::${options.baseURL || ''}::${trustedOrigins.join(',')}`;
  const existing = authCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const db = getDb(options.databaseUrl);

  const auth = betterAuth({
    appName: 'Crumbs',
    basePath: '/auth',
    secret: options.secret || 'crumbs-dev-secret-change-in-production',
    baseURL: options.baseURL || 'http://localhost:8787',
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: authSchema.User,
        session: authSchema.Session,
        account: authSchema.Account,
        verification: authSchema.Verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    plugins: [bearer()],
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
  });

  authCache.set(cacheKey, auth);
  return auth;
}

export type Auth = ReturnType<typeof getAuth>;
export type SessionUser = typeof authSchema.User.$inferSelect;
