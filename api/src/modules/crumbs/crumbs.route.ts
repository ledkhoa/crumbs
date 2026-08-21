import { Hono } from 'hono';
import type { AppEnv } from '../../core/types/env';
import { requireAuth } from '../../core/auth/auth.middleware';

export const crumbsRouter = new Hono<AppEnv>()
  .use('*', requireAuth)
  .get('/', (c) => {
    const user = c.get('user');

    return c.json({
      userId: user.id,
      crumbs: [],
      total: 0,
      message: 'Inbox endpoint ready for database integration',
    });
  });
