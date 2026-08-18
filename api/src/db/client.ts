import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schemas';

// In-memory cache across requests within the same Cloudflare Worker isolate
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let cachedUrl: string | null = null;

/**
 * Returns a cached Drizzle ORM client per Worker isolate, instantiating only once.
 */
export function getDb(databaseUrl: string) {
  if (cachedDb && cachedUrl === databaseUrl) {
    return cachedDb;
  }

  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql, { schema });
  cachedUrl = databaseUrl;
  return cachedDb;
}

export type DbClient = ReturnType<typeof getDb>;
