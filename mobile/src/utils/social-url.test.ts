import { describe, expect, it } from 'bun:test';
import {
  extractSocialUrl,
  sanitizeSocialUrl,
  parseSocialUrl,
  isValidSocialUrl,
} from './social-url';

describe('social-url utilities', () => {
  describe('parseSocialUrl', () => {
    it('parses standard Instagram Reel URLs', () => {
      const parsed = parseSocialUrl(
        'https://www.instagram.com/reel/C3zFooBar99/',
      );
      expect(parsed.platform).toBe('instagram');
      expect(parsed.platformPostId).toBe('C3zFooBar99');
      expect(parsed.postType).toBe('reel');
    });

    it('parses Instagram Post URLs', () => {
      const parsed = parseSocialUrl('https://instagram.com/p/ABC123xyz');
      expect(parsed.platform).toBe('instagram');
      expect(parsed.platformPostId).toBe('ABC123xyz');
      expect(parsed.postType).toBe('post');
    });

    it('parses standard TikTok Video URLs', () => {
      const parsed = parseSocialUrl(
        'https://www.tiktok.com/@foodielover/video/7342891238910000000',
      );
      expect(parsed.platform).toBe('tiktok');
      expect(parsed.platformPostId).toBe('7342891238910000000');
      expect(parsed.postType).toBe('video');
    });

    it('parses short TikTok URLs', () => {
      const parsed = parseSocialUrl('https://vm.tiktok.com/ZM8abc123/');
      expect(parsed.platform).toBe('tiktok');
      expect(parsed.platformPostId).toBe('ZM8abc123');
      expect(parsed.postType).toBe('video');
    });

    it('parses Instagram share/reel and share/p format URLs', () => {
      const reelShare = parseSocialUrl(
        'https://www.instagram.com/share/reel/C3zFooBar99/',
      );
      expect(reelShare.platform).toBe('instagram');
      expect(reelShare.platformPostId).toBe('C3zFooBar99');
      expect(reelShare.postType).toBe('reel');

      const postShare = parseSocialUrl(
        'https://www.instagram.com/share/p/ABC123xyz/',
      );
      expect(postShare.platform).toBe('instagram');
      expect(postShare.platformPostId).toBe('ABC123xyz');
      expect(postShare.postType).toBe('post');
    });

    it('parses Instagram TV format URLs', () => {
      const tvParsed = parseSocialUrl('https://instagram.com/tv/C3zFooBar99/');
      expect(tvParsed.platform).toBe('instagram');
      expect(tvParsed.platformPostId).toBe('C3zFooBar99');
      expect(tvParsed.postType).toBe('post');
    });

    it('parses various TikTok shortlink domains (vt, t, vm)', () => {
      const vt = parseSocialUrl('https://vt.tiktok.com/ZM8abc123/');
      expect(vt.platform).toBe('tiktok');
      expect(vt.platformPostId).toBe('ZM8abc123');

      const t = parseSocialUrl('https://t.tiktok.com/ZM8abc123/');
      expect(t.platform).toBe('tiktok');
      expect(t.platformPostId).toBe('ZM8abc123');
    });

    it('returns unknown for unsupported domains', () => {
      const parsed = parseSocialUrl('https://www.youtube.com/watch?v=12345');
      expect(parsed.platform).toBe('unknown');
      expect(parsed.platformPostId).toBeNull();
      expect(parsed.postType).toBe('unknown');
    });
  });

  describe('sanitizeSocialUrl', () => {
    it('strips tracking parameters from Instagram Reels', () => {
      const raw =
        'https://www.instagram.com/reel/C3zFooBar99/?igsh=MW12345&utm_source=ig_web_copy_link&utm_medium=social&igshid=abc&fbclid=xyz';
      const sanitized = sanitizeSocialUrl(raw);
      expect(sanitized).toBe('https://www.instagram.com/reel/C3zFooBar99/');
    });

    it('strips tracking parameters from TikTok videos', () => {
      const raw =
        'https://www.tiktok.com/@foodielover/video/7342891238910000000?is_from_webapp=1&sender_device=pc&_t=8lKk&_r=1';
      const sanitized = sanitizeSocialUrl(raw);
      expect(sanitized).toBe(
        'https://www.tiktok.com/@foodielover/video/7342891238910000000',
      );
    });

    it('cleans trailing punctuation and surrounding characters', () => {
      const raw1 = 'https://www.instagram.com/reel/C3zFooBar99/.,';
      expect(sanitizeSocialUrl(raw1)).toBe(
        'https://www.instagram.com/reel/C3zFooBar99/',
      );

      const raw2 = 'https://vm.tiktok.com/ZM8abc123/)';
      expect(sanitizeSocialUrl(raw2)).toBe('https://vm.tiktok.com/ZM8abc123');
    });
  });

  describe('extractSocialUrl', () => {
    it('extracts URL and caption from mixed share sheet text', () => {
      const rawText =
        'Best cacio e pepe in NYC! Check it out: https://www.instagram.com/reel/C3zFooBar99/?igsh=123 #nycfood';
      const extracted = extractSocialUrl(rawText);

      expect(extracted.url).toBe('https://www.instagram.com/reel/C3zFooBar99/');
      expect(extracted.platform).toBe('instagram');
      expect(extracted.platformPostId).toBe('C3zFooBar99');
      expect(extracted.postType).toBe('reel');
      expect(extracted.initialCaption).toBe(
        'Best cacio e pepe in NYC! Check it out: #nycfood',
      );
    });

    it('extracts URL when text is only a URL', () => {
      const rawText = 'https://vm.tiktok.com/ZM8abc123/';
      const extracted = extractSocialUrl(rawText);

      expect(extracted.url).toBe('https://vm.tiktok.com/ZM8abc123');
      expect(extracted.platform).toBe('tiktok');
      expect(extracted.platformPostId).toBe('ZM8abc123');
      expect(extracted.initialCaption).toBeUndefined();
    });

    it('handles direct URLs without scheme prefix', () => {
      const raw = 'instagram.com/reel/C3zFooBar99';
      const extracted = extractSocialUrl(raw);
      expect(extracted.url).toBe('https://www.instagram.com/reel/C3zFooBar99/');
      expect(extracted.platform).toBe('instagram');
      expect(extracted.platformPostId).toBe('C3zFooBar99');
    });

    it('returns empty/unknown structure for text without any social URLs', () => {
      const raw = 'Just a random caption with no links at all!';
      const extracted = extractSocialUrl(raw);
      expect(extracted.url).toBeNull();
      expect(extracted.platform).toBe('unknown');
      expect(extracted.initialCaption).toBe(
        'Just a random caption with no links at all!',
      );
    });
  });

  describe('isValidSocialUrl', () => {
    it('returns true for valid Instagram URL', () => {
      expect(isValidSocialUrl('https://instagram.com/reel/C3zFooBar99/')).toBe(
        true,
      );
    });

    it('returns true for valid TikTok URL', () => {
      expect(
        isValidSocialUrl(
          'https://www.tiktok.com/@chef/video/7342891238910000000',
        ),
      ).toBe(true);
    });

    it('returns false for invalid URL', () => {
      expect(isValidSocialUrl('https://google.com')).toBe(false);
      expect(isValidSocialUrl('')).toBe(false);
      expect(isValidSocialUrl('https://tiktok.com/@user')).toBe(false);
    });
  });
});
