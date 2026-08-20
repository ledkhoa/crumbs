import { describe, expect, it } from 'bun:test';
import { parseSocialUrl } from './url.utils';

describe('parseSocialUrl', () => {
  describe('Instagram URLs', () => {
    it('should parse standard Instagram post URL', () => {
      const result = parseSocialUrl('https://www.instagram.com/p/C_12345Abc/');
      expect(result).toEqual({
        platform: 'instagram',
        platformPostId: 'C_12345Abc',
        postType: 'post',
      });
    });

    it('should parse Instagram reel URL with query params', () => {
      const result = parseSocialUrl(
        'https://www.instagram.com/reel/DEv_xYyAbc/?igsh=MWQ1ZGUxMzBkMA==',
      );
      expect(result).toEqual({
        platform: 'instagram',
        platformPostId: 'DEv_xYyAbc',
        postType: 'reel',
      });
    });

    it('should parse Instagram share/reels URL format', () => {
      const result = parseSocialUrl('https://instagram.com/reels/C789xyz123/');
      expect(result).toEqual({
        platform: 'instagram',
        platformPostId: 'C789xyz123',
        postType: 'reel',
      });
    });
  });

  describe('TikTok URLs', () => {
    it('should parse standard TikTok desktop video URL', () => {
      const result = parseSocialUrl(
        'https://www.tiktok.com/@nycfoodguide/video/7345678901234567890?is_from_webapp=1',
      );
      expect(result).toEqual({
        platform: 'tiktok',
        platformPostId: '7345678901234567890',
        postType: 'video',
      });
    });

    it('should parse TikTok mobile shortlink URL', () => {
      const result = parseSocialUrl('https://vm.tiktok.com/ZMkY789abc/');
      expect(result).toEqual({
        platform: 'tiktok',
        platformPostId: null,
        postType: 'post',
      });
    });
  });

  describe('Invalid or Unsupported URLs', () => {
    it('should return unknown for non-social URLs', () => {
      const result = parseSocialUrl('https://nytimes.com/food/best-pizza');
      expect(result).toEqual({
        platform: 'unknown',
        platformPostId: null,
        postType: 'unknown',
      });
    });

    it('should return unknown for malformed URL strings', () => {
      const result = parseSocialUrl('not-a-valid-url');
      expect(result).toEqual({
        platform: 'unknown',
        platformPostId: null,
        postType: 'unknown',
      });
    });
  });
});
