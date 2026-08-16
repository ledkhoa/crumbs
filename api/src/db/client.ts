import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schemas';

/**
 * Creates a Drizzle ORM client configured for Cloudflare Workers / Neon serverless HTTP connection.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
