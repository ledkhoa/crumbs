import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types/env';
import { ingestRouter } from './routes/ingest';
import { crumbsRouter } from './routes/crumbs';
import { playlistsRouter } from './routes/playlists';

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

// Mount modular sub-routers
const _routes = app
  .route('/api/ingest', ingestRouter)
  .route('/api/crumbs', crumbsRouter)
  .route('/api/playlists', playlistsRouter);

export default app;
export type AppType = typeof _routes;
