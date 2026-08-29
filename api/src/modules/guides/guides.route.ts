import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../../core/types/env';
import { requireAuth } from '../../core/auth/auth.middleware';
import { getDb } from '../../core/db/client';
import { Guides } from '../../core/db/schemas';
import { GuidesRepository } from './guides.repository';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required').max(255),
  description: z.string().max(1000).optional(),
  emojiIcon: z.string().max(32).optional().default('🗺️'),
  coverImageUrl: z.url().optional(),
  isPublic: z.boolean().optional().default(false),
});

const updateGuideSchema = z.object({
  name: z.string().min(1, 'Guide name cannot be empty').max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  emojiIcon: z.string().max(32).optional(),
  coverImageUrl: z.url().optional().nullable(),
  isPublic: z.boolean().optional(),
});

const reorderGuideSchema = z.object({
  crumbIds: z.array(z.string()).min(1, 'At least one crumbId must be provided'),
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
  })
  /**
   * POST /guides/:id/crumbs
   * Links one or more crumbs to an existing user guide.
   */
  .post(
    '/:id/crumbs',
    zValidator(
      'json',
      z
        .object({
          crumbId: z.string().optional(),
          crumbIds: z.array(z.string()).optional(),
        })
        .refine(
          (data) =>
            Boolean(
              data.crumbId || (data.crumbIds && data.crumbIds.length > 0),
            ),
          { message: 'Either crumbId or crumbIds must be provided' },
        ),
    ),
    async (c) => {
      const user = c.get('user');
      const guideId = c.req.param('id');
      const { crumbId, crumbIds } = c.req.valid('json');
      const db = getDb(c.env.DATABASE_URL || '');

      const guide = await db.query.Guides.findFirst({
        where: and(eq(Guides.id, guideId), eq(Guides.userId, user.id)),
      });

      if (!guide) {
        return c.json(
          {
            success: false,
            error: 'Guide not found or private',
          },
          404,
        );
      }

      const targetIds = [...(crumbId ? [crumbId] : []), ...(crumbIds || [])];

      await GuidesRepository.addCrumbsBatch(db, guideId, targetIds);

      return c.json({
        success: true,
        message:
          targetIds.length === 1
            ? 'Crumb added to guide successfully'
            : `${targetIds.length} crumbs added to guide successfully`,
      });
    },
  )
  /**
   * PATCH /guides/:id
   * Updates an existing guide's metadata (name, description, emojiIcon, isPublic, coverImageUrl).
   */
  .patch('/:id', zValidator('json', updateGuideSchema), async (c) => {
    const user = c.get('user');
    const guideId = c.req.param('id');
    const data = c.req.valid('json');
    const db = getDb(c.env.DATABASE_URL || '');

    const updated = await GuidesRepository.update(db, guideId, user.id, data);

    if (!updated) {
      return c.json(
        {
          success: false,
          error: 'Guide not found or permission denied',
        },
        404,
      );
    }

    return c.json({
      success: true,
      guide: updated,
    });
  })
  /**
   * DELETE /guides/:id
   * Deletes a guide created by the authenticated user.
   */
  .delete('/:id', async (c) => {
    const user = c.get('user');
    const guideId = c.req.param('id');
    const db = getDb(c.env.DATABASE_URL || '');

    const deleted = await GuidesRepository.delete(db, guideId, user.id);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: 'Guide not found or permission denied',
        },
        404,
      );
    }

    return c.json({
      success: true,
      message: 'Guide deleted successfully',
    });
  })
  /**
   * DELETE /guides/:id/crumbs/:crumbId
   * Removes a single crumb from a user's guide.
   */
  .delete('/:id/crumbs/:crumbId', async (c) => {
    const user = c.get('user');
    const guideId = c.req.param('id');
    const crumbId = c.req.param('crumbId');
    const db = getDb(c.env.DATABASE_URL || '');

    const removed = await GuidesRepository.removeCrumb(
      db,
      guideId,
      crumbId,
      user.id,
    );

    if (!removed) {
      return c.json(
        {
          success: false,
          error: 'Guide or crumb association not found',
        },
        404,
      );
    }

    return c.json({
      success: true,
      message: 'Crumb removed from guide successfully',
    });
  })
  /**
   * PUT /guides/:id/reorder
   * Reorders the crumbs within a guide according to the provided crumbIds array.
   */
  .put('/:id/reorder', zValidator('json', reorderGuideSchema), async (c) => {
    const user = c.get('user');
    const guideId = c.req.param('id');
    const { crumbIds } = c.req.valid('json');
    const db = getDb(c.env.DATABASE_URL || '');

    const reordered = await GuidesRepository.reorderCrumbs(
      db,
      guideId,
      crumbIds,
      user.id,
    );

    if (!reordered) {
      return c.json(
        {
          success: false,
          error: 'Guide not found or permission denied',
        },
        404,
      );
    }

    return c.json({
      success: true,
      message: 'Guide crumbs reordered successfully',
    });
  });
