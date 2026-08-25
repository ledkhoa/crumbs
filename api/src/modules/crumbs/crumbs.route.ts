import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../../core/types/env';
import { requireAuth } from '../../core/auth/auth.middleware';
import { getDb } from '../../core/db/client';
import { CrumbsRepository } from './crumbs.repository';

const queryFilterSchema = z.object({
  status: z.enum(['inbox', 'saved', 'visited']).optional(),
  guideId: z.string().optional(),
  unorganized: z
    .string()
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
  bookable: z
    .string()
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
  neighborhood: z.string().optional(),
});

const updateCrumbSchema = z.object({
  status: z.enum(['inbox', 'saved', 'visited']).optional(),
  userNotes: z.string().max(1000).nullable().optional(),
  userHeroDishOverride: z.string().max(255).nullable().optional(),
});

export const crumbsRouter = new Hono<AppEnv>()
  .use('*', requireAuth)
  /**
   * GET /crumbs/counts
   * Returns lightweight aggregate counts for all and uncategorized user crumbs.
   */
  .get('/counts', async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DATABASE_URL || '');

    const counts = await CrumbsRepository.getUserCounts(db, user.id);
    return c.json({ success: true, counts }, 200);
  })
  /**
   * GET /crumbs
   * Returns enriched user crumbs with status, search, and unorganized filter metrics.
   */
  .get('/', zValidator('query', queryFilterSchema), async (c) => {
    const user = c.get('user');
    const db = getDb(c.env.DATABASE_URL || '');
    const filters = c.req.valid('query');

    const result = await CrumbsRepository.listUserCrumbs(db, user.id, filters);
    return c.json(result, 200);
  })
  /**
   * PATCH /crumbs/:id
   * Updates crumb status, personal notes, or hero dish override.
   */
  .patch('/:id', zValidator('json', updateCrumbSchema), async (c) => {
    const user = c.get('user');
    const crumbId = c.req.param('id');
    const input = c.req.valid('json');
    const db = getDb(c.env.DATABASE_URL || '');

    const updatedCrumb = await CrumbsRepository.update(
      db,
      crumbId,
      user.id,
      input,
    );

    if (!updatedCrumb) {
      return c.json(
        {
          success: false,
          error: 'Crumb not found or unauthorized',
        },
        404,
      );
    }

    return c.json(
      {
        success: true,
        crumb: updatedCrumb,
      },
      200,
    );
  })
  /**
   * DELETE /crumbs/:id
   * Removes a crumb from the user's library and any linked guides.
   */
  .delete('/:id', async (c) => {
    const user = c.get('user');
    const crumbId = c.req.param('id');
    const db = getDb(c.env.DATABASE_URL || '');

    const deleted = await CrumbsRepository.delete(db, crumbId, user.id);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: 'Crumb not found or unauthorized',
        },
        404,
      );
    }

    return c.json(
      {
        success: true,
        message: 'Crumb deleted successfully',
      },
      200,
    );
  });
