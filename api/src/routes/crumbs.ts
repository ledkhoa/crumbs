import { Hono } from 'hono';
import type { AppEnv } from '../types/env';
import { requireAuth } from '../middlewares/auth';

export const crumbsRouter = new Hono<AppEnv>();

// Protect all crumbs endpoints with authentication
crumbsRouter.use('*', requireAuth);

crumbsRouter.get('/', (c) => {
  const user = c.get('user');

  return c.json({
    userId: user.id,
    crumbs: [],
    total: 0,
    message: 'Inbox endpoint ready for database integration',
  });
});
