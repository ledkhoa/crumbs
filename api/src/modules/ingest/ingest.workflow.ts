import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from 'cloudflare:workers';
import { eq, and } from 'drizzle-orm';
import type { Bindings, IngestWorkflowParams } from '../../core/types/env';
import type {
  EnrichedRestaurant,
  MediaSnapshot,
  ProcessedCrumbPayload,
} from './ingest.types';
import {
  ScraperService,
  type ScraperJob,
  type ScrapedPostData,
  ScraperError,
} from './services/scraper.service';
import { AIService, type PostExtractionResult } from './services/ai.service';
import { PlacesService, type PlaceDetails } from './services/places.service';
import { getDb } from '../../core/db/client';
import {
  Posts,
  Restaurants,
  PostRestaurants,
  Crumbs,
} from '../../core/db/schemas';

interface ApifyWebhookPayload {
  status?: string;
  actorRunId?: string;
  defaultDatasetId?: string;
}

export class IngestWorkflow extends WorkflowEntrypoint<
  Bindings,
  IngestWorkflowParams
> {
  async run(
    event: WorkflowEvent<IngestWorkflowParams>,
    step: WorkflowStep,
  ): Promise<ProcessedCrumbPayload> {
    const { url, userId } = event.payload;
    const workflowStartTime = performance.now();

    console.log(
      `\n🚀 ===============================================================`,
    );
    console.log(`🍞 [IngestWorkflow] NEW INGESTION TRIGGERED`);
    console.log(`🔗 URL:       ${url}`);
    console.log(`👤 User ID:   ${userId || 'Anonymous'}`);
    console.log(`⏰ Started:   ${new Date().toISOString()}`);
    console.log(
      `===============================================================\n`,
    );

    const scraper = new ScraperService(this.env.APIFY_TOKEN);
    const ai = new AIService(this.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const places = new PlacesService(
      this.env.GOOGLE_PLACES_API_KEY || this.env.GOOGLE_GENERATIVE_AI_API_KEY,
    );

    let apifyWebhookUrl: string | undefined = undefined;
    if (this.env.API_BASE_URL) {
      const base = this.env.API_BASE_URL.replace(/\/$/, '');
      const secretParam = this.env.APIFY_WEBHOOK_SECRET
        ? `&token=${encodeURIComponent(this.env.APIFY_WEBHOOK_SECRET)}`
        : '';
      apifyWebhookUrl = `${base}/webhooks/apify?workflowId=${event.instanceId}${secretParam}`;
    }

    // Step 1a: Dispatch asynchronous Apify scraping job
    const scraperJob = await step.do(
      'start-scrape-job',
      {
        retries: {
          limit: 3,
          delay: '5 seconds',
          backoff: 'exponential',
        },
        timeout: '30 seconds',
      },
      async (): Promise<ScraperJob> => {
        console.log(`📥 [Step 1a] Dispatching scraping job for: ${url}`);
        if (apifyWebhookUrl) {
          console.log(
            `🪝 [Step 1a] Configured Apify Webhook: ${apifyWebhookUrl}`,
          );
        }
        return await scraper.startScrapeJob(url, {
          webhookUrl: apifyWebhookUrl,
        });
      },
    );

    // Step 1b: Wait for Webhook Event or Fallback Polling
    if (apifyWebhookUrl) {
      console.log(
        `💤 [Step 1b] Hibernating workflow until Apify webhook arrives (up to 10 minutes)...`,
      );
      const webhookEvent = await step.waitForEvent<ApifyWebhookPayload>(
        'wait-for-apify-webhook',
        {
          type: 'apify-scrape-complete',
          timeout: '10 minutes',
        },
      );

      console.log(
        `⚡ [Step 1b RESUMED] Received Apify webhook event:`,
        JSON.stringify(webhookEvent, null, 2),
      );

      if (webhookEvent?.payload?.status === 'FAILED') {
        throw new ScraperError(
          'Apify scraper run reported failure status via webhook',
          'SCRAPE_FAILED',
          true,
        );
      }
    } else {
      // Fallback durable polling if no public webhook URL is configured
      let isCompleted = false;
      const maxPollAttempts = 25; // 25 * 3s = 75s

      for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
        await step.sleep(`poll-wait-${attempt}`, '3 seconds');

        const status = await step.do(
          `check-scrape-status-${attempt}`,
          {
            retries: {
              limit: 2,
              delay: '2 seconds',
            },
            timeout: '15 seconds',
          },
          async () => {
            console.log(
              `⏳ [Step 1b Poll ${attempt}/${maxPollAttempts}] Checking Apify run ${scraperJob.runId}...`,
            );
            return await scraper.checkRunStatus(scraperJob.runId);
          },
        );

        if (status === 'SUCCEEDED') {
          console.log(`✅ [Step 1b] Apify scrape completed successfully!`);
          isCompleted = true;
          break;
        } else if (
          status === 'FAILED' ||
          status === 'TIMED-OUT' ||
          status === 'ABORTED'
        ) {
          throw new ScraperError(
            `Apify scraper run failed with terminal status: ${status}`,
            'SCRAPE_FAILED',
            true,
          );
        }
      }

      if (!isCompleted) {
        throw new ScraperError(
          `Apify scraping timed out after ${maxPollAttempts * 3} seconds`,
          'SCRAPE_FAILED',
          true,
        );
      }
    }

    // Step 1c: Fetch completed dataset items (< 1s)
    const scrapedData = await step.do(
      'fetch-scraped-dataset',
      {
        retries: {
          limit: 3,
          delay: '3 seconds',
        },
        timeout: '30 seconds',
      },
      async (): Promise<ScrapedPostData> => {
        console.log(
          `📥 [Step 1c] Fetching dataset items for: ${scraperJob.datasetId}`,
        );
        const data = await scraper.fetchDatasetItems(scraperJob.datasetId, {
          platform: scraperJob.platform,
          platformPostId: scraperJob.platformPostId,
        });

        console.log(
          `\n✅ [Step 1 SUCCESS] Metadata retrieved:`,
          JSON.stringify(
            {
              platform: data.platform,
              postType: data.postType,
              platformPostId: data.platformPostId,
              locationName: data.locationName,
              mediaUrlsCount: data.mediaUrls?.length ?? 0,
              captionSnippet:
                data.caption.length > 120
                  ? `${data.caption.substring(0, 120)}...`
                  : data.caption,
            },
            null,
            2,
          ),
        );

        return data;
      },
    );

    // Step 2: AI extraction
    const extraction = await step.do(
      'extract-restaurant-details',
      {
        retries: {
          limit: 2,
          delay: '3 seconds',
          backoff: 'linear',
        },
        timeout: '1 minute',
      },
      async (): Promise<PostExtractionResult> => {
        console.log(`🧠 [Step 2/5] Running AI structured entity extraction...`);
        const result = await ai.extract(scrapedData);

        console.log(
          `\n✅ [Step 2/5 SUCCESS] AI Extraction Complete:`,
          JSON.stringify(
            {
              classification: result.classification,
              summary: result.summary,
              restaurantCount: result.restaurants.length,
              restaurants: result.restaurants.map((r) => ({
                name: r.name,
                cuisine: r.cuisine,
                dishes: r.recommendedDishes,
                vibes: r.vibeTags,
              })),
            },
            null,
            2,
          ),
        );

        return result;
      },
    );

    // Step 3: Resolve coordinates & check DB cache
    const enrichedRestaurants = await step.do(
      'resolve-place-coordinates',
      {
        retries: {
          limit: 2,
          delay: '2 seconds',
        },
        timeout: '1 minute',
      },
      async (): Promise<EnrichedRestaurant[]> => {
        console.log(
          `📍 [Step 3/5] Resolving coordinates & addresses for ${extraction.restaurants.length} place(s)...`,
        );

        const db = this.env.DATABASE_URL ? getDb(this.env.DATABASE_URL) : null;

        const enriched: EnrichedRestaurant[] = await Promise.all(
          extraction.restaurants.map(async (restaurant, index) => {
            if (db) {
              try {
                const cached = await db.query.Restaurants.findFirst({
                  where: and(
                    eq(Restaurants.name, restaurant.name),
                    restaurant.city
                      ? eq(Restaurants.city, restaurant.city)
                      : undefined,
                  ),
                });

                const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
                const isFresh =
                  cached &&
                  cached.placesLastSyncedAt &&
                  Date.now() - new Date(cached.placesLastSyncedAt).getTime() <
                    SIX_MONTHS_MS;

                if (cached && cached.latitude && cached.longitude && isFresh) {
                  console.log(
                    `   ⚡ [Place ${index + 1}/${extraction.restaurants.length}] ${restaurant.name} (DB CACHE HIT - Synced within 6 months, skipped Places API)`,
                  );
                  const cachedDetails: PlaceDetails = {
                    placeId: cached.googlePlaceId ?? undefined,
                    name: cached.name,
                    formattedAddress: cached.formattedAddress ?? undefined,
                    neighborhood: cached.neighborhood ?? undefined,
                    latitude: cached.latitude ?? undefined,
                    longitude: cached.longitude ?? undefined,
                    mapsUrl: cached.mapsUrl ?? undefined,
                    websiteUrl: cached.websiteUrl ?? undefined,
                    rating: cached.rating ? Number(cached.rating) : undefined,
                    userRatingCount: cached.userRatingCount ?? undefined,
                    priceLevel: cached.priceLevel ?? undefined,
                    photoUrl: cached.photoUrl ?? undefined,
                    editorialSummary: cached.editorialSummary ?? undefined,
                    communityFavoriteDish:
                      cached.communityFavoriteDish ?? undefined,
                    reservationUrl: cached.reservationUrl ?? undefined,
                    // SAFETY: reservationProvider in DB is constrained by schema to valid reservation provider literals
                    reservationProvider:
                      (cached.reservationProvider as PlaceDetails['reservationProvider']) ??
                      undefined,
                    // SAFETY: regularOpeningHours is stored as JSON matching the hours array schema
                    regularOpeningHours:
                      (cached.regularOpeningHours as PlaceDetails['regularOpeningHours']) ??
                      undefined,
                  };
                  return {
                    ...restaurant,
                    placeDetails: cachedDetails,
                  };
                }

                if (cached && !isFresh) {
                  console.log(
                    `   🔄 [Place ${index + 1}/${extraction.restaurants.length}] ${restaurant.name} (DB CACHE STALE - Last synced > 6 months ago, refreshing from Places API)`,
                  );
                }
              } catch (dbErr) {
                console.warn(
                  `[Step 3 Cache Check Warning]: Could not query restaurant cache`,
                  dbErr,
                );
              }
            }

            const placeDetails = await places.resolve(
              restaurant.name,
              restaurant.city,
              restaurant.address,
              Boolean(restaurant.heroDish),
              restaurant.reservationProvider,
              restaurant.reservationUrl,
            );

            console.log(
              `   📍 [Place ${index + 1}/${extraction.restaurants.length}] ${restaurant.name}:`,
              JSON.stringify(
                {
                  heroDish:
                    restaurant.heroDish || 'None (Using Places Fallback)',
                  vibeAnchor: restaurant.vibeAnchor || 'N/A',
                  courseCategory: restaurant.courseCategory || 'N/A',
                  communityFavoriteDish:
                    placeDetails.communityFavoriteDish || 'N/A',
                  reservationProvider:
                    placeDetails.reservationProvider || 'None',
                  formattedAddress: placeDetails.formattedAddress,
                  coordinates:
                    placeDetails.latitude && placeDetails.longitude
                      ? `(${placeDetails.latitude}, ${placeDetails.longitude})`
                      : 'Unavailable',
                  rating: placeDetails.rating
                    ? `⭐ ${placeDetails.rating} (${placeDetails.userRatingCount || 0} reviews)`
                    : 'N/A',
                  mapsUrl: placeDetails.mapsUrl,
                },
                null,
                2,
              ),
            );

            return {
              ...restaurant,
              placeDetails,
            };
          }),
        );

        return enriched;
      },
    );

    // Step 4: Media snapshot staging
    const mediaSnapshot = await step.do(
      'cache-thumbnail-snapshot',
      async (): Promise<MediaSnapshot> => {
        console.log(`🖼️ [Step 4/5] Staging thumbnail media snapshot...`);
        const primaryMediaUrl = scrapedData?.mediaUrls?.[0] ?? null;

        const snapshot: MediaSnapshot = {
          originalUrl: primaryMediaUrl,
          r2Key: null,
          status: 'pending_r2_setup',
        };

        console.log(
          `✅ [Step 4/5 SUCCESS] Media snapshot:`,
          JSON.stringify(snapshot, null, 2),
        );
        return snapshot;
      },
    );

    // Step 5: Atomic database persistence
    const finalizedCrumb = await step.do(
      'persist-and-log-crumb',
      async (): Promise<ProcessedCrumbPayload> => {
        const totalDuration = performance.now() - workflowStartTime;

        const result: ProcessedCrumbPayload = {
          url,
          userId: userId ?? null,
          platform: scrapedData?.platform ?? 'unknown',
          postType: scrapedData?.postType ?? 'unknown',
          platformPostId: scrapedData?.platformPostId ?? null,
          authorUsername: scrapedData?.authorUsername ?? null,
          caption: scrapedData?.caption ?? '',
          locationName: scrapedData?.locationName ?? null,
          mediaUrls: scrapedData?.mediaUrls ?? [],
          mediaSnapshot,
          classification: extraction.classification,
          summary: extraction.summary,
          restaurants: enrichedRestaurants,
          processedAt: new Date().toISOString(),
        };

        if (this.env.DATABASE_URL) {
          try {
            console.log(
              `💾 [Step 5/5] Executing atomic database persistence...`,
            );
            const db = getDb(this.env.DATABASE_URL);

            const [savedPost] = await db
              .insert(Posts)
              .values({
                platform: result.platform,
                postType: result.postType,
                platformPostId:
                  result.platformPostId ||
                  `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                authorUsername: result.authorUsername,
                originalUrl: result.url,
                caption: result.caption,
                locationName: result.locationName,
                mediaUrls: result.mediaUrls,
                mediaSnapshot: result.mediaSnapshot,
                classification: result.classification,
                summary: result.summary,
                rawMetadataJson: scrapedData.rawMetadataJson,
              })
              .onConflictDoUpdate({
                target: [Posts.platform, Posts.platformPostId],
                set: {
                  authorUsername: result.authorUsername,
                  caption: result.caption,
                  locationName: result.locationName,
                  mediaUrls: result.mediaUrls,
                  mediaSnapshot: result.mediaSnapshot,
                  classification: result.classification,
                  summary: result.summary,
                  rawMetadataJson: scrapedData.rawMetadataJson,
                  updatedAt: new Date(),
                },
              })
              .returning();

            const persistedRestaurants: EnrichedRestaurant[] = [];

            for (const item of result.restaurants) {
              let restaurantRecord = null;

              if (item.placeDetails.placeId) {
                [restaurantRecord] = await db
                  .insert(Restaurants)
                  .values({
                    googlePlaceId: item.placeDetails.placeId,
                    name: item.name,
                    formattedAddress: item.placeDetails.formattedAddress,
                    city: item.city,
                    neighborhood: item.placeDetails.neighborhood,
                    state: item.state,
                    country: item.country,
                    latitude: item.placeDetails.latitude,
                    longitude: item.placeDetails.longitude,
                    cuisine: item.cuisine,
                    rating: item.placeDetails.rating
                      ? String(item.placeDetails.rating)
                      : null,
                    userRatingCount: item.placeDetails.userRatingCount,
                    priceLevel: item.placeDetails.priceLevel,
                    mapsUrl: item.placeDetails.mapsUrl,
                    websiteUrl: item.placeDetails.websiteUrl,
                    photoUrl: item.placeDetails.photoUrl,
                    editorialSummary: item.placeDetails.editorialSummary,
                    communityFavoriteDish:
                      item.placeDetails.communityFavoriteDish,
                    reservationUrl: item.placeDetails.reservationUrl,
                    reservationProvider: item.placeDetails.reservationProvider,
                    regularOpeningHours:
                      item.placeDetails.regularOpeningHours ?? null,
                    placesLastSyncedAt: new Date(),
                  })
                  .onConflictDoUpdate({
                    target: Restaurants.googlePlaceId,
                    set: {
                      formattedAddress: item.placeDetails.formattedAddress,
                      neighborhood: item.placeDetails.neighborhood,
                      latitude: item.placeDetails.latitude,
                      longitude: item.placeDetails.longitude,
                      cuisine: item.cuisine,
                      rating: item.placeDetails.rating
                        ? String(item.placeDetails.rating)
                        : null,
                      userRatingCount: item.placeDetails.userRatingCount,
                      priceLevel: item.placeDetails.priceLevel,
                      mapsUrl: item.placeDetails.mapsUrl,
                      websiteUrl: item.placeDetails.websiteUrl,
                      photoUrl: item.placeDetails.photoUrl,
                      editorialSummary: item.placeDetails.editorialSummary,
                      communityFavoriteDish:
                        item.placeDetails.communityFavoriteDish,
                      reservationUrl: item.placeDetails.reservationUrl,
                      reservationProvider:
                        item.placeDetails.reservationProvider,
                      regularOpeningHours:
                        item.placeDetails.regularOpeningHours ?? null,
                      placesLastSyncedAt: new Date(),
                      updatedAt: new Date(),
                    },
                  })
                  .returning();
              } else {
                [restaurantRecord] = await db
                  .insert(Restaurants)
                  .values({
                    name: item.name,
                    formattedAddress: item.placeDetails.formattedAddress,
                    city: item.city,
                    neighborhood: item.placeDetails.neighborhood,
                    state: item.state,
                    country: item.country,
                    latitude: item.placeDetails.latitude,
                    longitude: item.placeDetails.longitude,
                    cuisine: item.cuisine,
                    mapsUrl: item.placeDetails.mapsUrl,
                    placesLastSyncedAt: new Date(),
                  })
                  .returning();
              }

              let savedCrumbRecord = null;

              if (restaurantRecord && savedPost) {
                await db
                  .insert(PostRestaurants)
                  .values({
                    postId: savedPost.id,
                    restaurantId: restaurantRecord.id,
                    heroDish: item.heroDish,
                    vibeAnchor: item.vibeAnchor,
                    courseCategory: item.courseCategory,
                    walkInTips: item.walkInTips,
                    recommendedDishes: item.recommendedDishes || [],
                    vibeTags: item.vibeTags || [],
                    creatorNotes: item.notes,
                  })
                  .onConflictDoUpdate({
                    target: [
                      PostRestaurants.postId,
                      PostRestaurants.restaurantId,
                    ],
                    set: {
                      heroDish: item.heroDish,
                      vibeAnchor: item.vibeAnchor,
                      courseCategory: item.courseCategory,
                      walkInTips: item.walkInTips,
                      recommendedDishes: item.recommendedDishes || [],
                      vibeTags: item.vibeTags || [],
                      creatorNotes: item.notes,
                    },
                  });

                if (userId) {
                  [savedCrumbRecord] = await db
                    .insert(Crumbs)
                    .values({
                      userId,
                      restaurantId: restaurantRecord.id,
                      sourcePostId: savedPost.id,
                      status: 'inbox',
                    })
                    .onConflictDoUpdate({
                      target: [Crumbs.userId, Crumbs.restaurantId],
                      set: {
                        sourcePostId: savedPost.id,
                        updatedAt: new Date(),
                      },
                    })
                    .returning();
                }
              }

              persistedRestaurants.push({
                ...item,
                id: restaurantRecord?.id,
                crumbId: savedCrumbRecord?.id,
              });
            }

            result.restaurants = persistedRestaurants;

            console.log(
              `✅ [Step 5/5 SUCCESS] Persisted post, restaurants, and user crumbs to Neon DB!`,
            );
          } catch (dbError) {
            console.error(
              `❌ [Step 5/5 Error]: Failed to persist crumb to Neon DB:`,
              dbError,
            );
          }
        }

        console.log(
          `\n✨ ===============================================================`,
        );
        console.log(
          `🎉 [IngestWorkflow COMPLETED in ${Math.round(totalDuration)}ms]`,
        );
        console.log(
          `📦 FINALIZED CRUMB PAYLOAD:\n`,
          JSON.stringify(result, null, 2),
        );
        console.log(
          `===============================================================\n`,
        );

        return result;
      },
    );

    // Step 6: User Push Notification Dispatch (To-Do / Future Channel)
    // Dispatches an Expo Push Notification / APNs notification when background ingestion completes.
    await step.do('notify-user-completion', async () => {
      console.log(
        `\n🔔 ===============================================================`,
      );
      console.log(
        `🔔 [Step 6/6] INGESTION COMPLETE: Dispatching user notifications`,
      );
      console.log(`👤 User ID:      ${userId || 'Anonymous'}`);
      console.log(`🍽️ Crumbs Count: ${finalizedCrumb.restaurants.length}`);
      console.log(`🗺️ Destination:  Inbox`);
      console.log(
        `💡 Push Notification Dispatch:\n   • Channel: Expo Push Notifications API (APNs / FCM)\n   • Title: "🌿 Crumb Saved to Inbox!"\n   • Body: "${finalizedCrumb.restaurants[0]?.name || 'New Crumb'} (${finalizedCrumb.restaurants[0]?.heroDish || 'Must-Order Dish'})"\n   • Data: { crumbId: "...", url: "crumbs://inbox" }`,
      );
      console.log(
        `===============================================================\n`,
      );

      return {
        notified: false,
        userId: userId ?? null,
        crumbsSaved: finalizedCrumb.restaurants.length,
        channels: ['expo_push_pending_setup'],
        timestamp: new Date().toISOString(),
      };
    });

    return finalizedCrumb;
  }
}
