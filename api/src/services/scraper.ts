import { ApifyClient } from 'apify-client';

export interface ScrapedPostData {
  caption: string;
  locationName?: string;
  mediaUrls?: string[];
  platform: 'instagram' | 'tiktok' | 'unknown';
  shortcode?: string;
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
 * Extracts a normalized shortcode from an Instagram URL.
 */
export function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * ScraperService manages social media content extraction from Instagram & TikTok.
 */
export class ScraperService {
  private client?: ApifyClient;

  constructor(private token?: string) {
    if (token) {
      this.client = new ApifyClient({ token });
    }
  }

  /**
   * Scrapes metadata for a given post URL.
   * Throws a ScraperError if scraping fails or token is missing,
   * enabling Cloudflare Workflows to retry transient failures.
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
    const shortcode = isInstagram
      ? (extractInstagramShortcode(url) ?? undefined)
      : undefined;

    if (!this.token || !this.client) {
      throw new ScraperError(
        'APIFY_TOKEN is missing or not configured. Cannot perform live scraping.',
        'TOKEN_MISSING',
        false,
      );
    }

    try {
      console.log(
        `[ScraperService] Fetching live ${platform} data via Apify for: ${url}`,
      );

      const run = await this.client.actor('apify/instagram-scraper').call({
        directUrls: [url],
        resultsType: 'details',
        resultsLimit: 1,
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      if (items.length > 0) {
        const item = items[0] as {
          caption?: string;
          locationName?: string;
          location?: string;
          displayUrl?: string;
          [key: string]: unknown;
        };

        return {
          caption: item.caption || '',
          locationName: item.locationName || item.location || '',
          mediaUrls: item.displayUrl ? [item.displayUrl] : [],
          platform,
          shortcode,
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
