export interface ParsedSocialUrl {
  platform: 'instagram' | 'tiktok' | 'unknown';
  platformPostId: string | null;
  postType: 'reel' | 'carousel' | 'post' | 'video' | 'unknown';
}

/**
 * Extracts normalized platform, unique platform post ID, and initial post type from an Instagram or TikTok URL.
 */
export function parseSocialUrl(url: string): ParsedSocialUrl {
  const isInstagram = url.includes('instagram.com');
  const isTikTok = url.includes('tiktok.com');

  if (isInstagram) {
    const isReel = url.includes('/reel/') || url.includes('/reels/');
    const postIdMatch = url.match(/(?:p|reels|reel|tv)\/([A-Za-z0-9_-]+)/);
    return {
      platform: 'instagram',
      platformPostId: postIdMatch ? postIdMatch[1] : null,
      postType: isReel ? 'reel' : 'post',
    };
  }

  if (isTikTok) {
    const isVideo = url.includes('/video/');
    const postIdMatch = url.match(/\/video\/(\d+)/);
    return {
      platform: 'tiktok',
      platformPostId: postIdMatch ? postIdMatch[1] : null,
      postType: isVideo ? 'video' : 'post',
    };
  }

  return {
    platform: 'unknown',
    platformPostId: null,
    postType: 'unknown',
  };
}
