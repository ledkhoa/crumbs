import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../types/env';
import type { ProcessedCrumbPayload, EnrichedRestaurant } from '../types/crumb';
import { requireAuth } from '../middlewares/auth';
import { extractInstagramPostId } from '../services/scraper';
import { getDb } from '../db/client';
import { Posts, Crumbs, GuideCrumbs } from '../db/schemas';

const ingestSchema = z.object({
  url: z.url('Must be a valid social media URL (Instagram or TikTok)'),
  guideId: z.string().optional(),
});

export const ingestRouter = new Hono<AppEnv>();

// Protect all ingest routes with authentication
ingestRouter.use('*', requireAuth);

/**
 * POST /ingest
 * Accepts a social media link and triggers ingestion.
 *
 * FAST-PATH OPTIMIZATION:
 * If the post was already fully ingested and persisted in the database,
 * it creates the user crumb / guide link and returns 200 OK in < 50ms without starting a workflow.
 */
ingestRouter.post('/', zValidator('json', ingestSchema), async (c) => {
  const { url, guideId } = c.req.valid('json');
  const user = c.get('user');

  // Fast-Path Cache Check
  if (c.env.DATABASE_URL) {
    try {
      const isInstagram = url.includes('instagram.com');
      const platform = isInstagram
        ? 'instagram'
        : url.includes('tiktok.com')
          ? 'tiktok'
          : 'unknown';
      const platformPostId = isInstagram ? extractInstagramPostId(url) : null;

      if (platformPostId) {
        const db = getDb(c.env.DATABASE_URL);
        const existingPost = await db.query.Posts.findFirst({
          where: and(
            eq(Posts.platform, platform),
            eq(Posts.platformPostId, platformPostId),
          ),
          with: {
            postRestaurants: {
              with: {
                restaurant: true,
              },
            },
          },
        });

        if (existingPost && existingPost.postRestaurants.length > 0) {
          console.log(
            `⚡ [Fast-Path Cache Hit] Post ${platformPostId} already in DB. Linking user crumb...`,
          );

          const enrichedRestaurants: EnrichedRestaurant[] =
            existingPost.postRestaurants.map((pr) => ({
              name: pr.restaurant.name,
              cuisine: pr.restaurant.cuisine ?? undefined,
              address: pr.restaurant.formattedAddress ?? undefined,
              city: pr.restaurant.city ?? undefined,
              state: pr.restaurant.state ?? undefined,
              country: pr.restaurant.country ?? undefined,
              vibe: pr.vibeTags,
              recommendedDishes: pr.recommendedDishes,
              notes: pr.creatorNotes ?? undefined,
              placeDetails: {
                placeId: pr.restaurant.googlePlaceId ?? undefined,
                name: pr.restaurant.name,
                formattedAddress: pr.restaurant.formattedAddress ?? undefined,
                latitude: pr.restaurant.latitude ?? undefined,
                longitude: pr.restaurant.longitude ?? undefined,
                mapsUrl: pr.restaurant.mapsUrl ?? undefined,
                websiteUrl: pr.restaurant.websiteUrl ?? undefined,
                rating: pr.restaurant.rating
                  ? Number(pr.restaurant.rating)
                  : undefined,
                userRatingCount: pr.restaurant.userRatingCount ?? undefined,
                priceLevel: pr.restaurant.priceLevel ?? undefined,
                photoUrl: pr.restaurant.photoUrl ?? undefined,
              },
            }));

          // Link User Crumbs
          for (const pr of existingPost.postRestaurants) {
            const [savedCrumb] = await db
              .insert(Crumbs)
              .values({
                userId: user.id,
                restaurantId: pr.restaurantId,
                sourcePostId: existingPost.id,
                status: guideId ? 'saved' : 'inbox',
              })
              .onConflictDoUpdate({
                target: [Crumbs.userId, Crumbs.restaurantId],
                set: {
                  sourcePostId: existingPost.id,
                  updatedAt: new Date(),
                },
              })
              .returning();

            if (guideId && savedCrumb) {
              await db
                .insert(GuideCrumbs)
                .values({
                  guideId,
                  crumbId: savedCrumb.id,
                  orderIndex: 0,
                })
                .onConflictDoNothing();
            }
          }

          const cachedOutput: ProcessedCrumbPayload = {
            url: existingPost.originalUrl,
            guideId: guideId ?? null,
            userId: user.id,
            platform:
              existingPost.platform === 'instagram' ||
              existingPost.platform === 'tiktok'
                ? existingPost.platform
                : 'unknown',
            postType:
              existingPost.postType === 'reel' ||
              existingPost.postType === 'carousel' ||
              existingPost.postType === 'post' ||
              existingPost.postType === 'video'
                ? existingPost.postType
                : 'unknown',
            platformPostId: existingPost.platformPostId,
            caption: existingPost.caption ?? '',
            locationName: existingPost.locationName,
            mediaUrls: existingPost.mediaUrls,
            mediaSnapshot: existingPost.mediaSnapshot ?? {
              originalUrl: existingPost.mediaUrls[0] ?? null,
              r2Key: null,
              status: 'pending_r2_setup',
            },
            classification:
              existingPost.classification === 'restaurant_related' ||
              existingPost.classification === 'travel_unrelated_to_restaurants'
                ? existingPost.classification
                : 'random_unrelated',
            summary: existingPost.summary ?? '',
            restaurants: enrichedRestaurants,
            processedAt: new Date().toISOString(),
          };

          return c.json(
            {
              success: true,
              workflowId: `cached_${existingPost.id}`,
              status: 'complete',
              cached: true,
              output: cachedOutput,
              message:
                'Instant cache hit: Post already processed and linked to user',
            },
            200,
          );
        }
      }
    } catch (cacheErr) {
      console.warn(
        `[Fast-Path Cache Check Warning]: Proceeding with background workflow:`,
        cacheErr,
      );
    }
  }

  // Normal Async Ingestion Workflow
  try {
    const instance = await c.env.INGEST_WORKFLOW.create({
      params: {
        url,
        guideId,
        userId: user.id,
      },
    });

    return c.json(
      {
        success: true,
        workflowId: instance.id,
        status: 'queued',
        cached: false,
        message: 'Ingestion workflow dispatched successfully',
      },
      202,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to trigger ingestion';
    console.error('[Ingest Trigger Error]:', error);
    return c.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});

/**
 * GET /ingest/:instanceId
 * Checks the execution status and output of a queued ingestion workflow instance.
 */
ingestRouter.get('/:instanceId', async (c) => {
  const instanceId = c.req.param('instanceId');

  try {
    const instance = await c.env.INGEST_WORKFLOW.get(instanceId);
    const status = await instance.status();

    return c.json({
      success: true,
      workflowId: instanceId,
      status: status.status,
      output: (status.output as ProcessedCrumbPayload) ?? null,
      error: status.error ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Workflow instance not found';
    return c.json(
      {
        success: false,
        error: message,
      },
      404,
    );
  }
});
