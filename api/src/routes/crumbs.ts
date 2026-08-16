import { Hono } from 'hono';
import type { AppEnv } from '../types/env';

export const crumbsRouter = new Hono<AppEnv>();

crumbsRouter.get('/', (c) => {
  // Skeleton endpoint for user's inbox & saved crumbs
  return c.json({
    crumbs: [],
    total: 0,
    message: 'Inbox endpoint ready for database integration',
  });
});
