import { describe, expect, it } from 'bun:test';
import { ScraperService, ScraperError, type FetchFn } from './scraper.service';

describe('ScraperService', () => {
  it('should throw ScraperError when initialized without APIFY_TOKEN', async () => {
    const service = new ScraperService(undefined);
    expect(
      service.startScrapeJob('https://www.instagram.com/p/C_12345Abc/'),
    ).rejects.toThrow(ScraperError);
  });

  describe('fetchDatasetItems parser logic', () => {
    it('should parse Instagram post items correctly from mock dataset', async () => {
      const mockItems = [
        {
          caption: 'Best handmade pasta in NYC! @lilianewyork',
          locationName: 'Lilia, Brooklyn',
          ownerUsername: 'foodie_traveler',
          displayUrl: 'https://cdn.instagram.com/pic1.jpg',
          type: 'Post',
        },
      ];

      const mockFetch: FetchFn = async () =>
        new Response(JSON.stringify(mockItems), { status: 200 });

      const service = new ScraperService('test_token', mockFetch);
      const data = await service.fetchDatasetItems('dataset_123', {
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

    it('should extract all carousel child post slide URLs', async () => {
      const mockCarousel = [
        {
          caption: 'Top 3 Bakeries in Paris',
          ownerUsername: 'parisfoodguide',
          childPosts: [
            { displayUrl: 'https://cdn.instagram.com/slide1.jpg' },
            { displayUrl: 'https://cdn.instagram.com/slide2.jpg' },
            { displayUrl: 'https://cdn.instagram.com/slide3.jpg' },
          ],
          type: 'Sidecar',
        },
      ];

      const mockFetch: FetchFn = async () =>
        new Response(JSON.stringify(mockCarousel), { status: 200 });

      const service = new ScraperService('test_token', mockFetch);
      const data = await service.fetchDatasetItems('dataset_carousel', {
        platform: 'instagram',
      });

      expect(data.authorUsername).toBe('parisfoodguide');
      expect(data.postType).toBe('carousel');
      expect(data.mediaUrls).toHaveLength(3);
      expect(data.mediaUrls?.[1]).toBe('https://cdn.instagram.com/slide2.jpg');
    });

    it('should parse TikTok authorMeta and video displayUrl', async () => {
      const mockTikTok = [
        {
          caption: 'Secret ramen spot in Shibuya Tokyo #ramen',
          authorMeta: { name: 'tokyoeats', nickName: 'Tokyo Foodie' },
          displayUrl: 'https://cdn.tiktok.com/cover.jpg',
        },
      ];

      const mockFetch: FetchFn = async () =>
        new Response(JSON.stringify(mockTikTok), { status: 200 });

      const service = new ScraperService('test_token', mockFetch);
      const data = await service.fetchDatasetItems('dataset_tiktok', {
        platform: 'tiktok',
      });

      expect(data.authorUsername).toBe('tokyoeats');
      expect(data.platform).toBe('tiktok');
      expect(data.mediaUrls?.[0]).toBe('https://cdn.tiktok.com/cover.jpg');
    });
  });
});
