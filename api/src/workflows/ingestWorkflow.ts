import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from 'cloudflare:workers';
import type { Bindings, IngestWorkflowParams } from '../types/env';
import { scrapeSocialPost, type ScrapedPostData } from '../services/scraper';
import { extractRestaurantDetails } from '../services/ai';
import { resolvePlaceCoordinates } from '../services/places';

export class IngestWorkflow extends WorkflowEntrypoint<
  Bindings,
  IngestWorkflowParams
> {
  async run(event: WorkflowEvent<IngestWorkflowParams>, step: WorkflowStep) {
    const { url, guideId, userId } = event.payload;

    // Step 1: Scrape social media post metadata
    const scrapedData = (await step.do(
      'scrape-social-post',
      async (): Promise<ScrapedPostData> => {
        return await scrapeSocialPost(url, this.env.APIFY_TOKEN);
      },
    )) as ScrapedPostData;

    // Step 2: Extract structured restaurant details & vibe tags with Gemini 2.5 Flash
    const extraction = await step.do('extract-restaurant-details', async () => {
      return await extractRestaurantDetails(
        scrapedData,
        this.env.GOOGLE_GENERATIVE_AI_API_KEY,
      );
    });

    // Step 3: Resolve place details and geographic coordinates
    const enrichedRestaurants = await step.do(
      'resolve-place-coordinates',
      async () => {
        return await Promise.all(
          extraction.restaurants.map(async (restaurant) => {
            const placeDetails = await resolvePlaceCoordinates(
              restaurant.name,
              restaurant.city,
              restaurant.address,
            );
            return {
              ...restaurant,
              placeDetails,
            };
          }),
        );
      },
    );

    // Step 4: Cache thumbnail snapshot (R2 bucket storage)
    const mediaSnapshot = await step.do(
      'cache-thumbnail-snapshot',
      async () => {
        // TODO: Download video thumbnail from scrapedData.mediaUrls and upload to Cloudflare R2 bucket
        const primaryMediaUrl = scrapedData?.mediaUrls?.[0] ?? null;
        return {
          originalUrl: primaryMediaUrl,
          r2Key: null,
          status: 'pending_r2_setup',
        };
      },
    );

    // Step 5: Finalize and log parsed crumb
    const finalizedCrumb = await step.do('persist-and-log-crumb', async () => {
      const result = {
        url,
        guideId: guideId ?? null,
        userId: userId ?? null,
        platform: scrapedData?.platform ?? 'unknown',
        shortcode: scrapedData?.shortcode ?? null,
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
        '[IngestWorkflow] Successfully processed crumb:\n',
        JSON.stringify(result, null, 2),
      );
      // TODO: Future persistence via Drizzle ORM into NeonDB / Postgres
      return result;
    });

    return finalizedCrumb;
  }
}
