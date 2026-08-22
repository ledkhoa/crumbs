import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './core/types/env';
import { ingestRouter } from './modules/ingest/ingest.route';
import { crumbsRouter } from './modules/crumbs/crumbs.route';
import { guidesRouter } from './modules/guides/guides.route';
import { webhooksRouter } from './modules/ingest/webhooks.route';
import { getAuth } from './core/auth/auth';

export const app = new Hono<AppEnv>();

// Global middleware
app.use('*', cors());

// Health check / welcome route
app.get('/', (c) => {
  return c.json({
    name: 'Crumbs API',
    version: '0.1.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// BetterAuth authentication handler
app.on(['POST', 'GET'], '/auth/*', (c) => {
  const trustedOrigins = c.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL || '',
    secret: c.env.BETTER_AUTH_SECRET,
    baseURL: c.env.BETTER_AUTH_URL,
    trustedOrigins,
  });
  return auth.handler(c.req.raw);
});

// Mount modular sub-routers without /api prefix
export const routes = app
  .route('/ingest', ingestRouter)
  .route('/crumbs', crumbsRouter)
  .route('/guides', guidesRouter)
  .route('/webhooks', webhooksRouter);

export type AppType = typeof routes;
