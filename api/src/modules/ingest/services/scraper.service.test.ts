import { describe, expect, it } from 'bun:test';
import {
  ScraperService,
  ScraperError,
  parseDatasetItem,
} from './scraper.service';

describe('ScraperService', () => {
  it('should throw ScraperError when initialized without APIFY_TOKEN', async () => {
    const service = new ScraperService(undefined);
    expect(
      service.startScrapeJob('https://www.instagram.com/p/C_12345Abc/'),
    ).rejects.toThrow(ScraperError);
  });

  describe('parseDatasetItem pure parser logic', () => {
    it('should parse Instagram post items correctly from mock dataset', () => {
      const mockItem = {
        caption: 'Best handmade pasta in NYC! @lilianewyork',
        locationName: 'Lilia, Brooklyn',
        ownerUsername: 'foodie_traveler',
        displayUrl: 'https://cdn.instagram.com/pic1.jpg',
        type: 'Post',
      };

      const data = parseDatasetItem(mockItem, {
        platform: 'instagram',
        platformPostId: 'C_12345Abc',
      });

      expect(data.caption).toBe('Best handmade pasta in NYC! @lilianewyork');
      expect(data.authorUsername).toBe('foodie_traveler');
      expect(data.locationName).toBe('Lilia, Brooklyn');
      expect(data.platform).toBe('instagram');
      expect(data.mediaUrls).toHaveLength(1);
      expect(data.mediaUrls?.[0]).toBe('https://cdn.instagram.com/pic1.jpg');
    });

    it('should extract all carousel child post slide URLs', () => {
      const mockCarousel = {
        caption: 'Top 3 Bakeries in Paris',
        ownerUsername: 'parisfoodguide',
        childPosts: [
          { displayUrl: 'https://cdn.instagram.com/slide1.jpg' },
          { displayUrl: 'https://cdn.instagram.com/slide2.jpg' },
          { displayUrl: 'https://cdn.instagram.com/slide3.jpg' },
        ],
        type: 'Sidecar',
      };

      const data = parseDatasetItem(mockCarousel, {
        platform: 'instagram',
      });

      expect(data.authorUsername).toBe('parisfoodguide');
      expect(data.postType).toBe('carousel');
      expect(data.mediaUrls).toHaveLength(3);
      expect(data.mediaUrls?.[1]).toBe('https://cdn.instagram.com/slide2.jpg');
    });

    it('should parse TikTok authorMeta and video displayUrl', () => {
      const mockTikTok = {
        caption: 'Secret ramen spot in Shibuya Tokyo #ramen',
        authorMeta: { name: 'tokyoeats', nickName: 'Tokyo Foodie' },
        displayUrl: 'https://cdn.tiktok.com/cover.jpg',
      };

      const data = parseDatasetItem(mockTikTok, {
        platform: 'tiktok',
      });

      expect(data.authorUsername).toBe('tokyoeats');
      expect(data.platform).toBe('tiktok');
      expect(data.mediaUrls?.[0]).toBe('https://cdn.tiktok.com/cover.jpg');
    });
  });
});
