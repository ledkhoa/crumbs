export interface ScrapedPostData {
  caption: string;
  locationName?: string;
  mediaUrls?: string[];
  platform: 'instagram' | 'tiktok' | 'unknown';
  postType: 'reel' | 'carousel' | 'post' | 'video' | 'unknown';
  platformPostId?: string;
  rawMetadataJson?: string;
}

export class ScraperError extends Error {
  constructor(
    message: string,
    public code:
      | 'TOKEN_MISSING'
      | 'SCRAPE_FAILED'
      | 'NO_DATA_RETURNED'
      | 'UNSUPPORTED_PLATFORM',
    public isRetryable: boolean = true,
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}

/**
 * Extracts a normalized platform post ID from an Instagram URL.
 */
export function extractInstagramPostId(url: string): string | null {
  const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * ScraperService manages social media content extraction from Instagram & TikTok.
 */
export class ScraperService {
  constructor(private token?: string) {}

  /**
   * Scrapes metadata for a given post URL using Apify's synchronous actor endpoint.
   * Throws a typed ScraperError on failure to trigger Cloudflare Workflows automatic retries.
   */
  async scrape(url: string): Promise<ScrapedPostData> {
    const isInstagram = url.includes('instagram.com');
    const isTikTok = url.includes('tiktok.com');

    if (!isInstagram && !isTikTok) {
      throw new ScraperError(
        `Unsupported platform for URL: ${url}. Only Instagram and TikTok are supported.`,
        'UNSUPPORTED_PLATFORM',
        false,
      );
    }

    const platform = isInstagram ? 'instagram' : 'tiktok';
    const isReel = url.includes('/reel/');
    const platformPostId = isInstagram
      ? (extractInstagramPostId(url) ?? undefined)
      : undefined;

    if (!this.token) {
      throw new ScraperError(
        'APIFY_TOKEN is missing or not configured in environment bindings.',
        'TOKEN_MISSING',
        false,
      );
    }

    try {
      console.log(
        `[ScraperService] Fetching live ${platform} data via Apify for: ${url}`,
      );

      const response = await fetch(
        `https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items?token=${this.token}`,
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
        throw new ScraperError(
          `Apify API returned HTTP ${response.status}: ${errorText}`,
          'SCRAPE_FAILED',
          true,
        );
      }

      const items = (await response.json()) as Array<{
        caption?: string;
        locationName?: string;
        location?: string;
        displayUrl?: string;
        type?: string;
        childPosts?: Array<{ displayUrl?: string; [key: string]: unknown }>;
        images?: string[];
        [key: string]: unknown;
      }>;

      if (items && items.length > 0) {
        const item = items[0];

        const slideUrls =
          item.childPosts && Array.isArray(item.childPosts)
            ? item.childPosts
                .map((child) => child.displayUrl)
                .filter((url): url is string => Boolean(url))
            : [];

        const mediaUrls =
          slideUrls.length > 0
            ? slideUrls
            : item.images && item.images.length > 0
              ? item.images
              : item.displayUrl
                ? [item.displayUrl]
                : [];

        const postType: ScrapedPostData['postType'] =
          slideUrls.length > 0
            ? 'carousel'
            : isReel || item.type === 'Video'
              ? 'reel'
              : 'post';

        return {
          caption: item.caption || '',
          locationName: item.locationName || item.location || '',
          mediaUrls,
          platform,
          postType,
          platformPostId,
          rawMetadataJson: JSON.stringify(item),
        };
      }

      throw new ScraperError(
        `No post metadata returned by Apify for: ${url}. The post may be private or deleted.`,
        'NO_DATA_RETURNED',
        true,
      );
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown Apify scraping error';
      console.error(`[ScraperService Error]: ${message}`, error);

      throw new ScraperError(
        `Failed to scrape post at ${url}: ${message}`,
        'SCRAPE_FAILED',
        true,
      );
    }
  }
}
