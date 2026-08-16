import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from 'cloudflare:workers';
import type { Bindings, IngestWorkflowParams } from '../types/env';
import type {
  EnrichedRestaurant,
  MediaSnapshot,
  ProcessedCrumbPayload,
} from '../types/crumb';
import { ScraperService, type ScrapedPostData } from '../services/scraper';
import { AIService, type PostExtractionResult } from '../services/ai';
import { PlacesService } from '../services/places';

export class IngestWorkflow extends WorkflowEntrypoint<
  Bindings,
  IngestWorkflowParams
> {
  async run(
    event: WorkflowEvent<IngestWorkflowParams>,
    step: WorkflowStep,
  ): Promise<ProcessedCrumbPayload> {
    const { url, guideId, userId } = event.payload;
    const workflowStartTime = performance.now();

    console.log(
      `\n🚀 ===============================================================`,
    );
    console.log(`🍞 [IngestWorkflow] NEW INGESTION TRIGGERED`);
    console.log(`🔗 URL:       ${url}`);
    console.log(`🗺️ Guide ID:  ${guideId || 'None (Inbox)'}`);
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

    const scrapedData = await step.do(
      'scrape-social-post',
      {
        retries: {
          limit: 3,
          delay: '5 seconds',
          backoff: 'exponential',
        },
        timeout: '2 minutes',
      },
      async (): Promise<ScrapedPostData> => {
        console.log(`📥 [Step 1/5] Scraping post metadata for: ${url}`);
        const data = await scraper.scrape(url);

        console.log(
          `\n✅ [Step 1/5 SUCCESS] Metadata retrieved:`,
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
                vibes: r.vibe,
              })),
            },
            null,
            2,
          ),
        );

        return result;
      },
    );

    const enrichedRestaurants = await step.do(
      'resolve-place-coordinates',
      {
        retries: {
          limit: 2,
          delay: '2 seconds',
        },
      },
      async (): Promise<EnrichedRestaurant[]> => {
        console.log(
          `📍 [Step 3/5] Resolving coordinates & addresses for ${extraction.restaurants.length} place(s)...`,
        );

        const enriched: EnrichedRestaurant[] = await Promise.all(
          extraction.restaurants.map(async (restaurant, index) => {
            const placeDetails = await places.resolve(
              restaurant.name,
              restaurant.city,
              restaurant.address,
            );

            console.log(
              `   📍 [Place ${index + 1}/${extraction.restaurants.length}] ${restaurant.name}:`,
              JSON.stringify(
                {
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

    const finalizedCrumb = await step.do(
      'persist-and-log-crumb',
      async (): Promise<ProcessedCrumbPayload> => {
        const totalDuration = performance.now() - workflowStartTime;

        const result: ProcessedCrumbPayload = {
          url,
          guideId: guideId ?? null,
          userId: userId ?? null,
          platform: scrapedData?.platform ?? 'unknown',
          postType: scrapedData?.postType ?? 'unknown',
          platformPostId: scrapedData?.platformPostId ?? null,
          caption: scrapedData?.caption ?? '',
          locationName: scrapedData?.locationName ?? null,
          mediaUrls: scrapedData?.mediaUrls ?? [],
          mediaSnapshot,
          classification: extraction.classification,
          summary: extraction.summary,
          restaurants: enrichedRestaurants,
          processedAt: new Date().toISOString(),
        };

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

        // TODO: Future persistence via Drizzle ORM into NeonDB / Postgres
        return result;
      },
    );

    return finalizedCrumb;
  }
}
