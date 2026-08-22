import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../../core/types/env';
import type { ProcessedCrumbPayload } from './ingest.types';
import { requireAuth } from '../../core/auth/auth.middleware';
import { parseSocialUrl } from './url.utils';
import { getDb } from '../../core/db/client';
import { Posts, Crumbs } from '../../core/db/schemas';

const ingestSchema = z.object({
  url: z.url('Must be a valid social media URL (Instagram or TikTok)'),
});

export const ingestRouter = new Hono<AppEnv>()
  .use('*', requireAuth)
  /**
   * POST /ingest
   * Accepts a social media link and triggers ingestion.
   */
  .post('/', zValidator('json', ingestSchema), async (c) => {
    const { url } = c.req.valid('json');
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

            // Map created or updated crumb records to their corresponding restaurant
            const crumbMap = new Map<string, string>();

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
                    status: 'inbox',
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
                  crumbMap.set(pr.restaurantId, savedCrumb.id);
                }
              }
            }

            // Streamlined post summary
            const postSummary = {
              id: existingPost.id,
              authorUsername: existingPost.authorUsername ?? null,
              platform: existingPost.platform,
              originalUrl: existingPost.originalUrl,
              caption: existingPost.caption ?? '',
              classification: existingPost.classification,
              summary: existingPost.summary ?? '',
              mediaSnapshot: existingPost.mediaSnapshot ?? null,
            };

            // Streamlined restaurant summaries with resolved crumbId
            const restaurantsSummary = (existingPost.postRestaurants || []).map(
              (pr) => ({
                id: pr.restaurant.id,
                crumbId: crumbMap.get(pr.restaurantId) || undefined,
                name: pr.restaurant.name,
                formattedAddress: pr.restaurant.formattedAddress ?? null,
                neighborhood: pr.restaurant.neighborhood ?? null,
                city: pr.restaurant.city ?? null,
                state: pr.restaurant.state ?? null,
                country: pr.restaurant.country ?? null,
                rating: pr.restaurant.rating
                  ? Number(pr.restaurant.rating)
                  : null,
                priceLevel: pr.restaurant.priceLevel ?? null,
                photoUrl: pr.restaurant.photoUrl ?? null,
                heroDish:
                  pr.heroDish || pr.restaurant.communityFavoriteDish || null,
                vibeAnchor:
                  pr.vibeAnchor || pr.restaurant.editorialSummary || null,
                vibeTags: pr.vibeTags ?? [],
                walkInTips: pr.walkInTips ?? null,
                mapsUrl: pr.restaurant.mapsUrl ?? null,
                websiteUrl: pr.restaurant.websiteUrl ?? null,
                reservationUrl: pr.restaurant.reservationUrl ?? null,
                reservationProvider: pr.restaurant.reservationProvider ?? null,
              }),
            );

            return c.json(
              {
                success: true,
                workflowId: `cached_${existingPost.id}`,
                status: 'complete',
                cached: true,
                post: postSummary,
                restaurants: restaurantsSummary,
                message:
                  restaurantsSummary.length > 0
                    ? `Found ${restaurantsSummary.length} ${restaurantsSummary.length === 1 ? 'crumb' : 'crumbs'} in Crumbs community!`
                    : 'Post analyzed.',
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
  })
  /**
   * GET /ingest/:instanceId
   * Checks the execution status and output of a queued ingestion workflow instance.
   */
  .get('/:instanceId', async (c) => {
    const instanceId = c.req.param('instanceId');

    // Handle cached instance IDs directly without querying Cloudflare Workflow engine
    if (instanceId.startsWith('cached_')) {
      const postId = instanceId.replace(/^cached_/, '');
      if (c.env.DATABASE_URL) {
        const db = getDb(c.env.DATABASE_URL);
        const post = await db.query.Posts.findFirst({
          where: eq(Posts.id, postId),
          with: {
            postRestaurants: {
              with: {
                restaurant: true,
              },
            },
          },
        });

        if (post) {
          return c.json({
            success: true,
            workflowId: instanceId,
            status: 'complete',
            output: {
              url: post.originalUrl,
              userId: null,
              platform: post.platform,
              postType: post.postType,
              platformPostId: post.platformPostId,
              authorUsername: post.authorUsername,
              caption: post.caption || '',
              locationName: post.locationName,
              mediaUrls: post.mediaUrls || [],
              mediaSnapshot: {
                originalUrl: post.mediaSnapshot,
                r2Key: null,
                status: 'cached' as const,
              },
              classification: post.classification,
              summary: post.summary || '',
              restaurants: (post.postRestaurants || []).map((pr) => ({
                ...pr.restaurant,
                heroDish:
                  pr.heroDish ||
                  pr.restaurant.communityFavoriteDish ||
                  undefined,
                vibeAnchor:
                  pr.vibeAnchor || pr.restaurant.editorialSummary || undefined,
                vibeTags: pr.vibeTags || [],
                recommendedDishes: pr.recommendedDishes || [],
                walkInTips: pr.walkInTips || undefined,
                placeDetails: {
                  placeId: pr.restaurant.googlePlaceId || undefined,
                  name: pr.restaurant.name,
                  formattedAddress: pr.restaurant.formattedAddress || undefined,
                  neighborhood: pr.restaurant.neighborhood || undefined,
                  city: pr.restaurant.city || undefined,
                  state: pr.restaurant.state || undefined,
                  country: pr.restaurant.country || undefined,
                  rating: pr.restaurant.rating
                    ? Number(pr.restaurant.rating)
                    : undefined,
                  priceLevel: pr.restaurant.priceLevel || undefined,
                  photoUrl: pr.restaurant.photoUrl || undefined,
                  mapsUrl: pr.restaurant.mapsUrl || undefined,
                  websiteUrl: pr.restaurant.websiteUrl || undefined,
                  reservationUrl: pr.restaurant.reservationUrl || undefined,
                  // SAFETY: Database stores validated reservation provider enums
                  reservationProvider: pr.restaurant.reservationProvider as
                    | 'resy'
                    | 'opentable'
                    | 'sevenrooms'
                    | 'tock'
                    | 'custom'
                    | undefined,
                },
              })),
              processedAt:
                post.updatedAt?.toISOString() || new Date().toISOString(),
            },
            error: null,
          });
        }
      }
    }

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
