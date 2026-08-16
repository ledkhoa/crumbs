import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';
import { scrapeSocialPost } from '../services/scraper';
import { extractRestaurantDetails } from '../services/ai';
import { resolvePlaceCoordinates } from '../services/places';

const ingestSchema = z.object({
  url: z.url('Must be a valid social media URL (Instagram or TikTok)'),
  guideId: z.string().optional(),
});

export const ingestRouter = new Hono<AppEnv>();

ingestRouter.post('/', zValidator('json', ingestSchema), async (c) => {
  const { url, guideId } = c.req.valid('json');
  const startTime = performance.now();

  try {
    // 1. Scrape post metadata
    const scrapedData = await scrapeSocialPost(url, c.env.APIFY_TOKEN);

    // 2. Extract structured restaurant details via LLM
    const extraction = await extractRestaurantDetails(
      scrapedData,
      c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    );

    // 3. Resolve coordinates for extracted restaurants
    const enrichedRestaurants = await Promise.all(
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

    const duration = performance.now() - startTime;

    return c.json(
      {
        success: true,
        data: {
          url,
          guideId: guideId ?? null,
          platform: scrapedData.platform,
          shortcode: scrapedData.shortcode ?? null,
          caption: scrapedData.caption,
          locationName: scrapedData.locationName ?? null,
          mediaUrls: scrapedData.mediaUrls ?? [],
          classification: extraction.classification,
          summary: extraction.summary,
          restaurants: enrichedRestaurants,
        },
        meta: {
          processingTimeMs: Math.round(duration),
        },
      },
      200,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process URL';
    console.error('[Ingest Error]:', error);
    return c.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});
