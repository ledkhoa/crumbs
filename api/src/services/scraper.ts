export interface ScrapedPostData {
  caption: string;
  locationName?: string;
  mediaUrls?: string[];
  platform: 'instagram' | 'tiktok' | 'unknown';
  shortcode?: string;
  rawItem?: Record<string, unknown>;
}

/**
 * Extracts a normalized shortcode from an Instagram URL.
 */
export function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Scrapes post metadata using Apify if APIFY_TOKEN is configured.
 * Otherwise returns mock data for local testing.
 */
export async function scrapeSocialPost(
  url: string,
  apifyToken?: string,
): Promise<ScrapedPostData> {
  const isInstagram = url.includes('instagram.com');
  const isTikTok = url.includes('tiktok.com');
  const platform = isInstagram ? 'instagram' : isTikTok ? 'tiktok' : 'unknown';
  const shortcode = isInstagram
    ? (extractInstagramShortcode(url) ?? undefined)
    : undefined;

  if (apifyToken && isInstagram) {
    console.log(`[Scraper] Fetching live Instagram data via Apify for: ${url}`);
    const response = await fetch(
      `https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [url],
          resultsType: 'details',
          resultsLimit: 1,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Apify API returned HTTP ${response.status}: ${errorText}`,
      );
    }

    const items = (await response.json()) as Array<{
      caption?: string;
      locationName?: string;
      location?: string;
      displayUrl?: string;
      [key: string]: unknown;
    }>;

    if (items.length > 0) {
      const item = items[0];
      return {
        caption: item.caption || '',
        locationName: item.locationName || item.location || '',
        mediaUrls: item.displayUrl ? [item.displayUrl] : [],
        platform,
        shortcode,
        rawItem: item,
      };
    }

    throw new Error('No data returned by Apify for this URL');
  }

  // Development / Mock fallback
  console.log(
    '[Scraper] Using simulated fallback response (no APIFY_TOKEN configured or non-IG url)',
  );
  if (url.includes('type=travel')) {
    return {
      caption:
        'Exploring Kyoto bamboo groves and temples! Travel goals for 2026. #kyoto #japan #travel',
      locationName: 'Kyoto, Japan',
      platform,
      shortcode: shortcode ?? 'mock_travel_123',
    };
  }

  if (url.includes('type=random')) {
    return {
      caption: 'Funny golden retriever playing in the snow! #dogs #cute',
      platform,
      shortcode: shortcode ?? 'mock_dog_123',
    };
  }

  // Default mock restaurant post
  return {
    caption:
      "Had the absolute best fresh pasta at L'Artusi in West Village tonight! Truly 10/10. Address: 228 W 10th St, New York, NY 10014. Must try the beef carpaccio and mushroom ragu!",
    locationName: "L'Artusi",
    platform,
    shortcode: shortcode ?? 'mock_lartusi_123',
  };
}
