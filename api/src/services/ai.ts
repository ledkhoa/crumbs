import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { ScrapedPostData } from './scraper';

export const extractedRestaurantSchema = z.object({
  name: z.string().describe('The name of the restaurant, bar, bakery, or cafe'),
  cuisine: z
    .string()
    .optional()
    .describe(
      'Type of cuisine or food served (e.g. Italian, Japanese, Bakery, Specialty Coffee)',
    ),
  address: z
    .string()
    .optional()
    .describe(
      'Street address of the restaurant if mentioned in caption or location',
    ),
  city: z.string().optional().describe('City where the restaurant is located'),
  state: z.string().optional().describe('State, province, or region'),
  country: z.string().optional().describe('Country'),
  vibe: z
    .array(z.string())
    .optional()
    .describe(
      "Vibe tags (e.g. 'Cozy', 'Date Night', 'Late Night', 'Dimly Lit', 'Lively')",
    ),
  recommendedDishes: z
    .array(z.string())
    .optional()
    .describe('List of signature or recommended dishes mentioned'),
  notes: z
    .string()
    .optional()
    .describe(
      "Key context, highlights, or tips (e.g. 'Walk-in only', 'Make reservation 30 days ahead')",
    ),
});

export const postExtractionSchema = z.object({
  classification: z
    .enum([
      'restaurant_related',
      'travel_unrelated_to_restaurants',
      'random_unrelated',
    ])
    .describe('Categorize the post content'),
  summary: z.string().describe('Brief 1-sentence summary of the post content'),
  restaurants: z
    .array(extractedRestaurantSchema)
    .default([])
    .describe(
      "List of restaurants/food spots extracted from the post. Leave empty if classification is not 'restaurant_related'",
    ),
});

export type PostExtractionResult = z.infer<typeof postExtractionSchema>;

/**
 * Parses scraped social media content and returns structured restaurant entities.
 */
export async function extractRestaurantDetails(
  scrapedData: ScrapedPostData,
  apiKey?: string,
): Promise<PostExtractionResult> {
  const google = createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const prompt = `Analyze this social media post for restaurant/dining/food recommendations:
Tagged Location: ${scrapedData.locationName || 'None'}
Platform: ${scrapedData.platform}
Caption:
"""
${scrapedData.caption}
"""
${scrapedData.rawMetadataJson ? `Raw Metadata: ${scrapedData.rawMetadataJson}` : ''}`;

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: postExtractionSchema,
    system:
      "You are an expert food & lifestyle curator for Crumbs ('Spotify for Cravings'). Extract structured restaurant details, signature hero dishes, and vibe tags with high precision. If multiple restaurants are featured in a list or carousel, extract each one individually.",
    prompt,
  });

  return object;
}
