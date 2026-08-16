import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required'),
  description: z.string().optional(),
  emoji: z.string().optional().default('🗺️'),
  destinationCity: z.string().optional(),
});

export const guidesRouter = new Hono<AppEnv>();

guidesRouter.get('/', (c) => {
  return c.json({
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
  return c.json(
    {
      success: true,
      guide: {
        id: `guide-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
});
