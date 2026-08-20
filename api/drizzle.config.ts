import { defineConfig } from 'drizzle-kit';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Helper to parse Cloudflare .dev.vars file when running CLI commands locally
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const devVarsPath = resolve(process.cwd(), '.dev.vars');
  if (existsSync(devVarsPath)) {
    const content = readFileSync(devVarsPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        let value = trimmed.substring('DATABASE_URL='.length).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  }

  return '';
}

export default defineConfig({
  schema: './src/core/db/schemas',
  out: './src/core/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
