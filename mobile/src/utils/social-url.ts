export type SocialPlatform = 'instagram' | 'tiktok' | 'unknown';
export type SocialPostType = 'reel' | 'carousel' | 'post' | 'video' | 'unknown';

export interface ExtractedSocialShare {
  /** Clean, canonical URL ready for ingestion API */
  url: string | null;
  /** Raw unparsed URL extracted from string */
  rawUrl: string | null;
  /** Target social media platform */
  platform: SocialPlatform;
  /** Unique platform post ID (e.g. shortcode or video ID) */
  platformPostId: string | null;
  /** Detected post type */
  postType: SocialPostType;
  /** Extracted residual caption text without URL */
  initialCaption?: string;
}

export interface ParsedSocialUrl {
  platform: SocialPlatform;
  platformPostId: string | null;
  postType: SocialPostType;
}

const INSTAGRAM_REGEX =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels|tv|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i;

const TIKTOK_VIDEO_REGEX =
  /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([A-Za-z0-9_.-]+)\/video\/(\d+)/i;

const TIKTOK_SHORT_REGEX =
  /(?:https?:\/\/)?(?:vm|vt|t)\.tiktok\.com\/([A-Za-z0-9_-]+)/i;

const BROAD_URL_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Sanitizes tracking query parameters while preserving the core canonical URL.
 */
export function sanitizeSocialUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  const trimmed = rawUrl.trim();

  // Clean trailing punctuation commonly attached by share sheets
  const cleanedUrl = trimmed.replace(/[.,!?:;)"']+$/, '');

  // 1. Instagram Sanitization
  const igMatch = cleanedUrl.match(INSTAGRAM_REGEX);
  if (igMatch) {
    const postId = igMatch[1];
    const isReel =
      cleanedUrl.includes('/reel/') ||
      cleanedUrl.includes('/reels/') ||
      cleanedUrl.includes('/share/reel');
    return isReel
      ? `https://www.instagram.com/reel/${postId}/`
      : `https://www.instagram.com/p/${postId}/`;
  }

  // 2. TikTok Standard Video Sanitization
  const ttVideoMatch = cleanedUrl.match(TIKTOK_VIDEO_REGEX);
  if (ttVideoMatch) {
    const username = ttVideoMatch[1];
    const videoId = ttVideoMatch[2];
    return `https://www.tiktok.com/@${username}/video/${videoId}`;
  }

  // 3. TikTok Short Link Sanitization
  const ttShortMatch = cleanedUrl.match(TIKTOK_SHORT_REGEX);
  if (ttShortMatch) {
    const shortcode = ttShortMatch[1];
    const hostMatch = cleanedUrl.match(
      /(?:https?:\/\/)?((?:vm|vt|t)\.tiktok\.com)/i,
    );
    const domain = hostMatch ? hostMatch[1].toLowerCase() : 'vm.tiktok.com';
    return `https://${domain}/${shortcode}`;
  }

  // Fallback: Strip common tracking query params via URL object if valid
  try {
    const parsed = new URL(cleanedUrl);
    const trackingParams = [
      'igsh',
      'igshid',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      '_t',
      '_r',
      'is_from_webapp',
      'sender_device',
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return cleanedUrl;
  }
}

/**
 * Parses platform, platformPostId, and postType from a social media URL.
 */
export function parseSocialUrl(url: string): ParsedSocialUrl {
  if (!url) {
    return {
      platform: 'unknown',
      platformPostId: null,
      postType: 'unknown',
    };
  }

  const isInstagram = url.includes('instagram.com');
  const isTikTok = url.includes('tiktok.com');

  if (isInstagram) {
    const isReel =
      url.includes('/reel/') ||
      url.includes('/reels/') ||
      url.includes('/share/reel');
    const igMatch = url.match(
      /(?:p|reels|reel|tv|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i,
    );
    return {
      platform: 'instagram',
      platformPostId: igMatch ? igMatch[1] : null,
      postType: isReel ? 'reel' : 'post',
    };
  }

  if (isTikTok) {
    const ttVideoMatch = url.match(/\/video\/(\d+)/i);
    if (ttVideoMatch) {
      return {
        platform: 'tiktok',
        platformPostId: ttVideoMatch[1],
        postType: 'video',
      };
    }

    const ttShortMatch = url.match(
      /(?:vm|vt|t)\.tiktok\.com\/([A-Za-z0-9_-]+)/i,
    );
    if (ttShortMatch) {
      return {
        platform: 'tiktok',
        platformPostId: ttShortMatch[1],
        postType: 'video',
      };
    }

    return {
      platform: 'tiktok',
      platformPostId: null,
      postType: 'video',
    };
  }

  return {
    platform: 'unknown',
    platformPostId: null,
    postType: 'unknown',
  };
}

/**
 * Extracts social media URLs and residual caption text from an incoming OS share string.
 */
export function extractSocialUrl(rawText: string): ExtractedSocialShare {
  if (!rawText) {
    return {
      url: null,
      rawUrl: null,
      platform: 'unknown',
      platformPostId: null,
      postType: 'unknown',
    };
  }

  const matches = rawText.match(BROAD_URL_REGEX);

  if (matches && matches.length > 0) {
    for (const candidate of matches) {
      const cleanCandidate = candidate.replace(/[.,!?:;)"']+$/, '');
      const parsed = parseSocialUrl(cleanCandidate);

      if (parsed.platform !== 'unknown') {
        const sanitized = sanitizeSocialUrl(cleanCandidate);
        const residualCaption = rawText
          .replace(candidate, '')
          .replace(/\s+/g, ' ')
          .trim();

        return {
          url: sanitized,
          rawUrl: cleanCandidate,
          platform: parsed.platform,
          platformPostId: parsed.platformPostId,
          postType: parsed.postType,
          initialCaption:
            residualCaption.length > 0 ? residualCaption : undefined,
        };
      }
    }
  }

  // Check if rawText is itself a direct URL without protocol prefix
  const parsedDirect = parseSocialUrl(rawText.trim());
  if (parsedDirect.platform !== 'unknown') {
    const formatted = rawText.trim().startsWith('http')
      ? rawText.trim()
      : `https://${rawText.trim()}`;
    const sanitized = sanitizeSocialUrl(formatted);
    return {
      url: sanitized,
      rawUrl: rawText.trim(),
      platform: parsedDirect.platform,
      platformPostId: parsedDirect.platformPostId,
      postType: parsedDirect.postType,
    };
  }

  return {
    url: null,
    rawUrl: null,
    platform: 'unknown',
    platformPostId: null,
    postType: 'unknown',
    initialCaption: rawText.trim().length > 0 ? rawText.trim() : undefined,
  };
}

/**
 * Validates whether a given string contains a supported Instagram or TikTok post URL.
 */
export function isValidSocialUrl(url: string): boolean {
  if (!url) return false;
  const parsed = parseSocialUrl(url);
  return parsed.platform !== 'unknown' && parsed.platformPostId !== null;
}
