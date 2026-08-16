import { generateText, Output } from 'ai';
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
      'Street address of the restaurant if mentioned in caption, slides, or location',
    ),
  city: z.string().optional().describe('City where the restaurant is located'),
  state: z.string().optional().describe('State, province, or region'),
  country: z.string().optional().describe('Country'),
  vibe: z
    .array(z.string())
    .optional()
    .describe(
      "Vibe tags (e.g. 'Cozy', 'Date Night', 'Late Night', 'Dimly Lit', 'Lively', 'Scenic Views', 'Rooftop')",
    ),
  recommendedDishes: z
    .array(z.string())
    .optional()
    .describe('List of signature or recommended dishes mentioned or shown'),
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
 * AIService handles multimodal structured entity extraction and classification using Gemini 2.5 Flash.
 */
export class AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey?: string) {
    this.google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  /**
   * Parses scraped social media content and visual image slides/thumbnails,
   * returning structured restaurant entities with high precision.
   */
  async extract(scrapedData: ScrapedPostData): Promise<PostExtractionResult> {
    const promptText = `Analyze this social media post for restaurant/dining/food recommendations:
Tagged Location: ${scrapedData.locationName || 'None'}
Platform: ${scrapedData.platform}
Caption:
"""
${scrapedData.caption}
"""
${scrapedData.rawMetadataJson ? `Raw Metadata: ${scrapedData.rawMetadataJson}` : ''}`;

    const mediaUrls = (scrapedData.mediaUrls || []).filter(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
    );

    // Build modern multimodal message payload (supporting text + image files)
    type MessageContentPart =
      | { type: 'text'; text: string }
      | { type: 'file'; data: URL; mediaType: string };

    const content: MessageContentPart[] = [{ type: 'text', text: promptText }];

    // Pass up to 10 visual slides/images for multimodal vision & OCR analysis
    for (const url of mediaUrls.slice(0, 10)) {
      try {
        content.push({
          type: 'file',
          data: new URL(url),
          mediaType: 'image/jpeg',
        });
      } catch (err) {
        console.warn(`[AIService] Skipping invalid media URL: ${url}`, err);
      }
    }

    const { output } = await generateText({
      model: this.google('gemini-3.7-flash'),
      output: Output.object({ schema: postExtractionSchema }),
      system:
        "You are an expert food & lifestyle curator for Crumbs ('Spotify for Cravings'). Extract structured restaurant details, signature hero dishes, and vibe tags with high precision. When images or carousel slides are attached, carefully inspect all graphic text, titles, numbered lists, and photos to extract every featured restaurant, cafe, bar, or bakery individually.",
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    if (!output) {
      throw new Error('AI failed to generate structured output');
    }

    return output;
  }
}
