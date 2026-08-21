import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../../core/types/env';
import { requireAuth } from '../../core/auth/auth.middleware';
import { getDb } from '../../core/db/client';
import { GuidesRepository } from './guides.repository';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required').max(255),
  description: z.string().max(1000).optional(),
  emojiIcon: z.string().max(32).optional().default('🗺️'),
  coverImageUrl: z.url().optional(),
  isPublic: z.boolean().optional().default(false),
});

export const guidesRouter = new Hono<AppEnv>()
  .use('*', requireAuth)
  /**
   * GET /guides
   * Returns all guides created by the authenticated user with crumbCount and thumbnail previews.
   */
  .get('/', async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DATABASE_URL || '');

    const guides = await GuidesRepository.listUserGuides(db, user.id);

    return c.json({
      success: true,
      guides,
      total: guides.length,
    });
  })
  /**
   * POST /guides
   * Creates a new curated guide for the authenticated user.
   */
  .post('/', zValidator('json', createGuideSchema), async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const db = getDb(c.env.DATABASE_URL || '');

    const guide = await GuidesRepository.create(db, user.id, data);

    return c.json(
      {
        success: true,
        guide: {
          ...guide,
          crumbCount: 0,
        },
      },
      201,
    );
  })
  /**
   * GET /guides/:id
   * Returns a full detailed guide with all ordered crumbs, restaurants, hero dishes, and creator attribution.
   */
  .get('/:id', async (c) => {
    const user = c.get('user');
    const guideId = c.req.param('id');
    const db = getDb(c.env.DATABASE_URL || '');

    const guide = await GuidesRepository.getByIdWithCrumbs(
      db,
      guideId,
      user.id,
    );

    if (!guide) {
      return c.json(
        {
          success: false,
          error: 'Guide not found or private',
        },
        404,
      );
    }

    return c.json({
      success: true,
      guide,
    });
  });
