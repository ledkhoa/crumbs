import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types/env';
import { ingestRouter } from './routes/ingest';
import { crumbsRouter } from './routes/crumbs';
import { guidesRouter } from './routes/guides';
import { IngestWorkflow } from './workflows/ingestWorkflow';
import { getAuth } from './auth';

const app = new Hono<AppEnv>();

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
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL || '',
    secret: c.env.BETTER_AUTH_SECRET,
    baseURL: c.env.BETTER_AUTH_URL,
  });
  return auth.handler(c.req.raw);
});

// Mount modular sub-routers without /api prefix
const _routes = app
  .route('/ingest', ingestRouter)
  .route('/crumbs', crumbsRouter)
  .route('/guides', guidesRouter);

export default app;
export { IngestWorkflow };
export type AppType = typeof _routes;
