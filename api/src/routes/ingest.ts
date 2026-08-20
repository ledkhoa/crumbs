import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../types/env';
import type { ProcessedCrumbPayload } from '../types/crumb';
import { requireAuth } from '../middlewares/auth';
import { parseSocialUrl } from '../utils/url';
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
      const { platform, platformPostId } = parseSocialUrl(url);

      if (platformPostId && platform !== 'unknown') {
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

        if (existingPost) {
          console.log(
            `⚡ [Fast-Path Cache Hit] Post ${platformPostId} already in DB (${existingPost.classification}). Returning instant cached result...`,
          );

          // Link User Crumbs (if restaurants were found)
          const linkedCrumbs: Array<{
            id: string;
            userId: string;
            restaurantId: string;
            sourcePostId: string | null;
            status: string;
            userNotes: string | null;
            userHeroDishOverride: string | null;
          }> = [];

          if (
            existingPost.postRestaurants &&
            existingPost.postRestaurants.length > 0
          ) {
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

              if (savedCrumb) {
                linkedCrumbs.push({
                  id: savedCrumb.id,
                  userId: savedCrumb.userId,
                  restaurantId: savedCrumb.restaurantId,
                  sourcePostId: savedCrumb.sourcePostId,
                  status: savedCrumb.status,
                  userNotes: savedCrumb.userNotes,
                  userHeroDishOverride: savedCrumb.userHeroDishOverride,
                });

                if (guideId) {
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
            }
          }

          // Structured per-table response payload
          const postData = {
            id: existingPost.id,
            platform: existingPost.platform,
            postType: existingPost.postType,
            platformPostId: existingPost.platformPostId,
            authorUsername: existingPost.authorUsername ?? null,
            originalUrl: existingPost.originalUrl,
            caption: existingPost.caption ?? '',
            locationName: existingPost.locationName ?? null,
            mediaUrls: existingPost.mediaUrls ?? [],
            mediaSnapshot: existingPost.mediaSnapshot ?? null,
            classification: existingPost.classification,
            summary: existingPost.summary ?? '',
          };

          const restaurantsData = (existingPost.postRestaurants || []).map(
            (pr) => ({
              id: pr.restaurant.id,
              googlePlaceId: pr.restaurant.googlePlaceId ?? null,
              name: pr.restaurant.name,
              formattedAddress: pr.restaurant.formattedAddress ?? null,
              city: pr.restaurant.city ?? null,
              state: pr.restaurant.state ?? null,
              country: pr.restaurant.country ?? null,
              latitude: pr.restaurant.latitude ?? null,
              longitude: pr.restaurant.longitude ?? null,
              cuisine: pr.restaurant.cuisine ?? null,
              rating: pr.restaurant.rating
                ? Number(pr.restaurant.rating)
                : null,
              userRatingCount: pr.restaurant.userRatingCount ?? null,
              priceLevel: pr.restaurant.priceLevel ?? null,
              mapsUrl: pr.restaurant.mapsUrl ?? null,
              websiteUrl: pr.restaurant.websiteUrl ?? null,
              photoUrl: pr.restaurant.photoUrl ?? null,
              editorialSummary: pr.restaurant.editorialSummary ?? null,
              communityFavoriteDish:
                pr.restaurant.communityFavoriteDish ?? null,
              reservationUrl: pr.restaurant.reservationUrl ?? null,
              reservationProvider: pr.restaurant.reservationProvider ?? null,
              regularOpeningHours: pr.restaurant.regularOpeningHours ?? null,
              postAttribution: {
                heroDish: pr.heroDish ?? null,
                vibeAnchor: pr.vibeAnchor ?? null,
                courseCategory: pr.courseCategory ?? null,
                walkInTips: pr.walkInTips ?? null,
                vibeTags: pr.vibeTags ?? [],
                recommendedDishes: pr.recommendedDishes ?? [],
                creatorNotes: pr.creatorNotes ?? null,
              },
            }),
          );

          return c.json(
            {
              success: true,
              workflowId: `cached_${existingPost.id}`,
              status: 'complete',
              cached: true,
              data: {
                post: postData,
                restaurants: restaurantsData,
                crumbs: linkedCrumbs,
              },
              message:
                existingPost.postRestaurants &&
                existingPost.postRestaurants.length > 0
                  ? 'Instant cache hit: Post already processed and linked to user'
                  : 'Instant cache hit: Post already analyzed (no food spots found)',
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

    // SAFETY: IngestWorkflow.run() returns a finalized ProcessedCrumbPayload as its output
    const output = (status.output as ProcessedCrumbPayload) ?? null;

    return c.json({
      success: true,
      workflowId: instanceId,
      status: status.status,
      output,
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
