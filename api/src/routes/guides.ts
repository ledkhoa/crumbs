import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';
import { requireAuth } from '../middlewares/auth';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required'),
  description: z.string().optional(),
  emoji: z.string().optional().default('🗺️'),
  destinationCity: z.string().optional(),
});

export const guidesRouter = new Hono<AppEnv>();

// Protect all guides endpoints with authentication
guidesRouter.use('*', requireAuth);

guidesRouter.get('/', (c) => {
  const user = c.get('user');

  return c.json({
    userId: user.id,
    guides: [
      {
        id: 'demo-1',
        name: 'Tokyo 2026 Trip',
        emoji: '🇯🇵',
        destinationCity: 'Tokyo',
        itemCount: 8,
      },
      {
        id: 'demo-2',
        name: 'West Village Date Spots',
        emoji: '🍷',
        destinationCity: 'New York',
        itemCount: 4,
      },
    ],
  });
});

guidesRouter.post('/', zValidator('json', createGuideSchema), (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');

  return c.json(
    {
      success: true,
      guide: {
        id: `guide-${Date.now()}`,
        userId: user.id,
        ...data,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
});
