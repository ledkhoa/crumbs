import { generateText, Output } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { sanitizeHeroDish } from './places.service';
import type { ScrapedPostData } from './scraper.service';

export const extractedRestaurantSchema = z.object({
  name: z.string().describe('The name of the restaurant, bar, bakery, or cafe'),
  cuisine: z
    .string()
    .optional()
    .describe(
      'Type of cuisine or food served (e.g. Italian, Japanese, French Bakery, Specialty Coffee)',
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
  heroDish: z
    .string()
    .optional()
    .describe(
      'The single primary, signature, viral, or must-order dish highlighted for this spot (e.g. "Truffle Cacio e Pepe", "Pistachio Escargot Croissant"). Must be a specific culinary menu item, NOT conversational text (NEVER "i\'ve had in a while", "best food", "so good"). Null/empty if no specific dish is featured.',
    ),
  vibeAnchor: z
    .string()
    .optional()
    .describe(
      'A concise, evocative 3-8 word sensory atmosphere description (e.g. "Low-lit vinyl listening bar with natural orange wines", "Sun-drenched patio with homemade sourdough").',
    ),
  courseCategory: z
    .enum([
      'aperitif',
      'main',
      'dessert',
      'cafe_bakery',
      'cocktail_bar',
      'snack',
    ])
    .optional()
    .describe(
      'Dining course classification for food crawl sequencing. aperitif = pre-dinner drinks/small bites; main = full dinner/lunch; dessert = sweets/gelato; cafe_bakery = breakfast/coffee/pastries; cocktail_bar = late night drinks; snack = street food/quick bite.',
    ),
  walkInTips: z
    .string()
    .optional()
    .describe(
      'Tactical walk-in or reservation advice mentioned by creator (e.g. "Arrive 15 mins before 5 PM opening", "Book Resy 30 days ahead at midnight", "Bar seating is walk-in only").',
    ),
  reservationProvider: z
    .enum(['resy', 'opentable', 'sevenrooms', 'tock', 'custom'])
    .optional()
    .describe(
      'Reservation platform if explicitly mentioned in caption or text (resy, opentable, sevenrooms, tock, custom)',
    ),
  reservationUrl: z
    .string()
    .optional()
    .describe('Direct reservation link if found in caption or metadata'),
  vibeTags: z
    .array(z.string())
    .default([])
    .describe(
      "3 to 6 standardized vibe & search filter tags representing mood, crowd, and dining occasion (e.g. ['Date Night', 'Dimly Lit', 'Natural Wine', 'Outdoor Patio', 'Late Night', 'Aesthetic Cafe', 'Lively & Loud', 'Solo Dining', 'Scenic Views', 'Hidden Gem'])",
    ),
  recommendedDishes: z
    .array(z.string())
    .default([])
    .describe('List of all signature or recommended dishes mentioned or shown'),
  notes: z
    .string()
    .optional()
    .describe('Any additional context or highlights mentioned by the creator.'),
});

export const postExtractionSchema = z.object({
  classification: z
    .enum([
      'restaurant_related',
      'travel_unrelated_to_restaurants',
      'random_unrelated',
    ])
    .describe(
      'Classification: restaurant_related if it highlights food, dining, drinks, bakeries, or cafes; travel_unrelated_to_restaurants if travel/hotel/scenery without restaurants; random_unrelated otherwise.',
    ),
  summary: z
    .string()
    .describe('A punchy 1-2 sentence editorial overview of the post curation.'),
  restaurants: z
    .array(extractedRestaurantSchema)
    .describe(
      'List of distinct restaurant/food spot entities extracted from the post. Empty if unrelated.',
    ),
});

export type ExtractedRestaurant = z.infer<typeof extractedRestaurantSchema>;
export type PostExtractionResult = z.infer<typeof postExtractionSchema>;

export class AIError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly isQuotaOrRateLimit: boolean = false,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * AIService handles multimodal structured entity extraction and classification.
 */
export class AIService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey?: string) {
    this.google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  /**
   * Analyzes social media post content (caption + slide/video frames)
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

    type MessageContentPart =
      | { type: 'text'; text: string }
      | { type: 'image'; image: ArrayBuffer; mimeType: string };

    const content: MessageContentPart[] = [{ type: 'text', text: promptText }];

    // Concurrently fetch up to 5 image slides safely with strict 4s timeouts (skip any that fail)
    if (mediaUrls.length > 0) {
      const fetchPromises = mediaUrls.slice(0, 5).map(async (url) => {
        const imageRes = await fetch(url, {
          signal: AbortSignal.timeout(4000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          },
        });
        if (!imageRes.ok) return null;
        const buffer = await imageRes.arrayBuffer();
        if (buffer.byteLength === 0 || buffer.byteLength > 4 * 1024 * 1024) {
          return null;
        }
        const mimeType =
          imageRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
        return { buffer, mimeType };
      });

      const results = await Promise.allSettled(fetchPromises);
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          content.push({
            type: 'image',
            image: res.value.buffer,
            mimeType: res.value.mimeType,
          });
        }
      }
    }

    const systemPrompt =
      "You are an expert food, vibe, and travel curator for Crumbs ('Spotify for Cravings'). Extract structured restaurant recommendations with extreme taste and precision.\n\nCRITICAL EXTRACTION GUIDELINES:\n1. HERO DISH: Extract the single most celebrated, viral, or must-order food/drink item mentioned or shown (e.g. 'Spicy Rigatoni Vodka', 'Pistachio Croissant', 'Truffle Burger').\n- MUST be a specific culinary menu item name.\n- NEVER output conversational fragments, sentiment phrases, or review snippets (NEVER output 'i\\'ve had in a while', 'best food ever', 'a must try', 'the vibes', 'so good', 'everything'). If no specific dish is featured, leave heroDish empty/null.\n2. VIBE ANCHOR: Craft a vivid, sensory 3-to-8 word mood description that captures the unique atmosphere (e.g. 'Low-lit vinyl listening bar with orange wine', 'Charming sunlit courtyard with handmade pasta'). Avoid generic terms like 'Good food'.\n3. VIBE TAGS: Always synthesize 3 to 6 high-intent search filter tags representing the mood, crowd, aesthetic, and dining occasion (e.g. ['Date Night', 'Dimly Lit', 'Natural Wine', 'Vinyl Bar', 'Outdoor Patio', 'Solo Dining', 'Late Night', 'Aesthetic Cafe', 'Scenic Views', 'Hidden Gem']). Never leave vibeTags empty.\n4. COURSE CATEGORY: Classify the meal role: 'aperitif' (drinks + light snacks), 'main' (full meal), 'dessert' (bakeries, ice cream, sweets), 'cafe_bakery' (morning coffee, pastries), 'cocktail_bar' (late night drinks), or 'snack' (quick bites/street food).\n5. WALK-IN & RESERVATION TIPS: Extract any reservation windows, line-up warnings, or walk-in tricks (e.g. 'Book Resy 30 days ahead'). If Resy, OpenTable, SevenRooms, or Tock is mentioned, identify the reservationProvider.\n6. MULTI-SPOT POSTS: When carousel slides or numbered lists appear, thoroughly inspect every slide image and graphic text to extract each distinct restaurant.";

    const sanitizeResult = (
      result: PostExtractionResult,
    ): PostExtractionResult => ({
      ...result,
      restaurants: result.restaurants.map((r) => ({
        ...r,
        heroDish: sanitizeHeroDish(r.heroDish),
      })),
    });

    try {
      // First attempt: with loaded images (if any succeeded)
      const { output } = await generateText({
        model: this.google('gemini-3.6-flash'),
        output: Output.object({ schema: postExtractionSchema }),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      if (!output) {
        throw new AIError('AI model returned an empty output response.');
      }

      return sanitizeResult(output);
    } catch (err: unknown) {
      // If the multimodal call failed and images were attached, fall back immediately to text-only
      const hasImagesAttached = content.length > 1;
      if (hasImagesAttached) {
        console.warn(
          `[AIService] Multimodal extraction failed or timed out. Falling back to text-only extraction...`,
        );
        try {
          const { output: fallbackOutput } = await generateText({
            model: this.google('gemini-2.5-flash-lite'),
            output: Output.object({ schema: postExtractionSchema }),
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: promptText }],
              },
            ],
          });

          if (fallbackOutput) {
            return sanitizeResult(fallbackOutput);
          }
        } catch (fallbackErr) {
          console.error(
            `[AIService] Fallback text-only extraction also failed:`,
            fallbackErr,
          );
        }
      }

      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      const isQuotaOrRateLimit =
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('rate limit');

      console.error(
        `\n❌ ===============================================================`,
      );
      if (isQuotaOrRateLimit) {
        console.error(
          `🚨 [AIService ERROR] GEMINI API RATE LIMIT / QUOTA EXCEEDED!`,
        );
        console.error(
          `💡 Details: Your Google Generative AI API key has exceeded its free-tier RPM (Requests Per Minute) or daily token quota.`,
        );
      } else {
        console.error(
          `🚨 [AIService ERROR] Failed to extract entities via Gemini API:`,
        );
      }
      console.error(`💥 Error Message: ${errorMessage}`);
      if (err instanceof Error && err.stack) {
        console.error(`📍 Stack Trace: ${err.stack}`);
      }
      console.error(
        `===============================================================\n`,
      );

      throw new AIError(
        `[AIService Extraction Failed]: ${errorMessage}`,
        err,
        isQuotaOrRateLimit,
      );
    }
  }
}
