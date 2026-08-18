export interface ScrapedPostData {
  caption: string;
  locationName?: string;
  mediaUrls?: string[];
  platform: 'instagram' | 'tiktok' | 'unknown';
  postType: 'reel' | 'carousel' | 'post' | 'video' | 'unknown';
  platformPostId?: string;
  rawMetadataJson?: string;
}

export interface ScraperJob {
  runId: string;
  datasetId: string;
  platform: 'instagram' | 'tiktok';
  postType: 'reel' | 'carousel' | 'post' | 'video' | 'unknown';
  platformPostId?: string;
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

interface ApifyRunResponse {
  data?: {
    id: string;
    status:
      'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
    defaultDatasetId: string;
  };
}

export interface StartScrapeOptions {
  webhookUrl?: string;
}

/**
 * ScraperService manages social media content extraction from Instagram & TikTok.
 * Attaches dynamic Apify webhooks to seamlessly resume Cloudflare Workflows via step.waitForEvent().
 */
export class ScraperService {
  constructor(private token?: string) {}

  /**
   * Dispatches an asynchronous Apify Actor run and configures optional webhook callback.
   * Returns immediately (< 400ms).
   */
  async startScrapeJob(
    url: string,
    options?: StartScrapeOptions,
  ): Promise<ScraperJob> {
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

    console.log(
      `[ScraperService] Starting async ${platform} scraper actor for: ${url}`,
    );

    const requestBody = {
      directUrls: [url],
      resultsType: 'details',
      resultsLimit: 1,
    };

    // If webhooks are supported in actor run payload
    const queryParams = new URLSearchParams({ token: this.token });
    if (options?.webhookUrl) {
      queryParams.set(
        'webhooks',
        btoa(
          JSON.stringify([
            {
              eventTypes: [
                'ACTOR.RUN.SUCCEEDED',
                'ACTOR.RUN.FAILED',
                'ACTOR.RUN.TIMED_OUT',
                'ACTOR.RUN.ABORTED',
              ],
              requestUrl: options.webhookUrl,
            },
          ]),
        ),
      );
    }

    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?${queryParams.toString()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    if (!startRes.ok) {
      const errorText = await startRes.text();
      throw new ScraperError(
        `Failed to start Apify actor (HTTP ${startRes.status}): ${errorText}`,
        'SCRAPE_FAILED',
        true,
      );
    }

    const startData = (await startRes.json()) as ApifyRunResponse;
    const runId = startData.data?.id;
    const datasetId = startData.data?.defaultDatasetId;

    if (!runId || !datasetId) {
      throw new ScraperError(
        'Apify did not return valid runId or datasetId',
        'SCRAPE_FAILED',
        true,
      );
    }

    return {
      runId,
      datasetId,
      platform,
      postType: isReel ? 'reel' : 'post',
      platformPostId,
    };
  }

  /**
   * Fast status check (< 200ms) for an ongoing Apify Actor run (used for fallback polling).
   */
  async checkRunStatus(
    runId: string,
  ): Promise<
    'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED'
  > {
    if (!this.token) {
      throw new ScraperError('APIFY_TOKEN is missing', 'TOKEN_MISSING', false);
    }

    const statusRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs/${runId}?token=${this.token}`,
    );

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      throw new ScraperError(
        `Failed to check Apify actor status (HTTP ${statusRes.status}): ${errorText}`,
        'SCRAPE_FAILED',
        true,
      );
    }

    const runStatus = (await statusRes.json()) as ApifyRunResponse;
    const status = runStatus.data?.status;

    if (!status) {
      throw new ScraperError(
        'Invalid status response from Apify',
        'SCRAPE_FAILED',
        true,
      );
    }

    return status;
  }

  /**
   * Retrieves and formats completed dataset items from Apify.
   */
  async fetchDatasetItems(
    datasetId: string,
    jobMeta: {
      platform: 'instagram' | 'tiktok';
      platformPostId?: string;
    },
  ): Promise<ScrapedPostData> {
    if (!this.token) {
      throw new ScraperError('APIFY_TOKEN is missing', 'TOKEN_MISSING', false);
    }

    const datasetRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.token}&clean=true`,
    );

    if (!datasetRes.ok) {
      const errorText = await datasetRes.text();
      throw new ScraperError(
        `Failed to fetch dataset items (HTTP ${datasetRes.status}): ${errorText}`,
        'SCRAPE_FAILED',
        true,
      );
    }

    const items = (await datasetRes.json()) as Array<{
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
          : item.type === 'Video'
            ? 'reel'
            : 'post';

      return {
        caption: item.caption || '',
        locationName: item.locationName || item.location || '',
        mediaUrls,
        platform: jobMeta.platform,
        postType,
        platformPostId: jobMeta.platformPostId,
        rawMetadataJson: JSON.stringify(item),
      };
    }

    throw new ScraperError(
      'No post metadata returned by Apify. The post may be private or deleted.',
      'NO_DATA_RETURNED',
      true,
    );
  }
}
