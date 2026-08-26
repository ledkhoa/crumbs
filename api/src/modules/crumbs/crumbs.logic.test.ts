import { describe, expect, it } from 'bun:test';
import type { EnrichedUserCrumb, CrumbFilterOptions } from './crumbs.types';

/**
 * Pure helper function implementing the 3-Tier Hero Dish Resolution algorithm
 * identically to CrumbsRepository & GuidesRepository.
 */
export function resolveEffectiveHeroDish(
  userHeroDishOverride?: string | null,
  postHeroDish?: string | null,
  communityFavoriteDish?: string | null,
): string | null {
  return userHeroDishOverride || postHeroDish || communityFavoriteDish || null;
}

export interface FilterCrumbsResult {
  filtered: EnrichedUserCrumb[];
  unorganizedCount: number;
  bookableCount: number;
}

/**
 * Pure filter evaluator mirroring CrumbsRepository.listUserCrumbs client-side filtering.
 */
export function filterCrumbs(
  crumbs: EnrichedUserCrumb[],
  options: CrumbFilterOptions = {},
): FilterCrumbsResult {
  let unorganizedCount = 0;
  let bookableCount = 0;

  for (const c of crumbs) {
    if (c.guideIds.length === 0) unorganizedCount++;
    if (
      Boolean(c.restaurant.reservationUrl) ||
      Boolean(c.restaurant.reservationProvider)
    ) {
      bookableCount++;
    }
  }

  let filtered = crumbs;

  if (options.status) {
    filtered = filtered.filter((c) => c.status === options.status);
  }

  if (options.unorganized === true) {
    filtered = filtered.filter((c) => c.guideIds.length === 0);
  }

  if (options.bookable === true) {
    filtered = filtered.filter(
      (c) =>
        Boolean(c.restaurant.reservationUrl) ||
        Boolean(c.restaurant.reservationProvider),
    );
  }

  if (options.guideId) {
    filtered = filtered.filter((c) => c.guideIds.includes(options.guideId!));
  }

  if (options.neighborhood) {
    const targetN = options.neighborhood.toLowerCase();
    filtered = filtered.filter((c) =>
      c.restaurant.formattedAddress?.toLowerCase().includes(targetN),
    );
  }

  return {
    filtered,
    unorganizedCount,
    bookableCount,
  };
}

describe('Crumbs Business Logic & Specification Verification', () => {
  describe('3-Tier Effective Hero Dish Resolution', () => {
    it('Tier 3 (User Override) takes highest precedence over post dish & community dish', () => {
      const result = resolveEffectiveHeroDish(
        'Secret Off-Menu Truffle Pasta',
        'Cacio e Pepe',
        'Rigatoni Bolognese',
      );
      expect(result).toBe('Secret Off-Menu Truffle Pasta');
    });

    it('Tier 1 (Post Hero Dish) takes precedence when no user override exists', () => {
      const result = resolveEffectiveHeroDish(
        null,
        'Cacio e Pepe',
        'Rigatoni Bolognese',
      );
      expect(result).toBe('Cacio e Pepe');
    });

    it('Tier 2 (Community Favorite Dish) takes precedence when post dish is absent', () => {
      const result = resolveEffectiveHeroDish(null, null, 'Rigatoni Bolognese');
      expect(result).toBe('Rigatoni Bolognese');
    });

    it('Returns null when no hero dish data exists at any tier', () => {
      const result = resolveEffectiveHeroDish(null, null, null);
      expect(result).toBeNull();
    });

    it('Treats empty strings as falsy and falls back to lower tier', () => {
      const result = resolveEffectiveHeroDish('', '', 'Classic Margherita');
      expect(result).toBe('Classic Margherita');
    });
  });

  describe('Search & Filter Engine', () => {
    const mockCrumbs: EnrichedUserCrumb[] = [
      {
        id: 'crumb-1',
        userId: 'user-1',
        restaurantId: 'rest-1',
        sourcePostId: 'post-1',
        status: 'inbox',
        isVisited: false,
        userNotes: 'Must sit outside on patio',
        userHeroDishOverride: null,
        effectiveHeroDish: 'Spicy Vodka Rigatoni',
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-20T10:00:00Z',
        restaurant: {
          id: 'rest-1',
          googlePlaceId: 'place-1',
          name: 'Trattoria Bella',
          formattedAddress: '123 Bleecker St, West Village, NY',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          latitude: 40.73,
          longitude: -74.0,
          cuisine: 'Italian',
          rating: 4.8,
          userRatingCount: 520,
          priceLevel: '$$$',
          mapsUrl: 'https://maps.google.com/?q=place-1',
          websiteUrl: 'https://trattoriabella.com',
          photoUrl: 'https://images.unsplash.com/photo-1',
          editorialSummary: 'Rustic Italian pasta bar',
          communityFavoriteDish: 'Spicy Vodka Rigatoni',
          reservationUrl: 'https://resy.com/cities/ny/trattoria-bella',
          reservationProvider: 'resy',
        },
        sourcePost: {
          id: 'post-1',
          platform: 'instagram',
          postType: 'reel',
          platformPostId: 'reel-123',
          authorUsername: 'pastalover_nyc',
          originalUrl: 'https://instagram.com/reel/reel-123',
          caption: 'Best pasta in Greenwich Village!',
          locationName: 'Trattoria Bella',
          mediaUrls: ['https://cdn.instagram.com/reel-1.mp4'],
          classification: 'restaurant_related',
          summary: 'Authentic handmade pasta and cozy ambience',
        },
        postAttribution: {
          heroDish: 'Spicy Vodka Rigatoni',
          vibeAnchor: 'Candlelit romantic trattoria',
          courseCategory: 'main',
          walkInTips: 'Walk-ins line up at 4:30pm',
          vibeTags: ['Date Night', 'Romantic', 'Natural Wine'],
          recommendedDishes: ['Spicy Vodka Rigatoni', 'Burrata'],
          creatorNotes: null,
        },
        guideIds: [],
        guides: [],
      },
      {
        id: 'crumb-2',
        userId: 'user-1',
        restaurantId: 'rest-2',
        sourcePostId: 'post-2',
        status: 'inbox',
        isVisited: false,
        userNotes: null,
        userHeroDishOverride: 'Matcha Soft Serve',
        effectiveHeroDish: 'Matcha Soft Serve',
        createdAt: '2026-08-21T12:00:00Z',
        updatedAt: '2026-08-21T12:00:00Z',
        restaurant: {
          id: 'rest-2',
          googlePlaceId: 'place-2',
          name: 'Kyoto Tea House',
          formattedAddress: '456 Bowery, East Village, NY',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          latitude: 40.72,
          longitude: -73.99,
          cuisine: 'Japanese Dessert',
          rating: 4.6,
          userRatingCount: 310,
          priceLevel: '$$',
          mapsUrl: 'https://maps.google.com/?q=place-2',
          websiteUrl: 'https://kyototea.com',
          photoUrl: 'https://images.unsplash.com/photo-2',
          editorialSummary: 'Artisanal matcha cafe',
          communityFavoriteDish: 'Matcha Mille Crepe',
          reservationUrl: null,
          reservationProvider: null,
        },
        sourcePost: {
          id: 'post-2',
          platform: 'tiktok',
          postType: 'video',
          platformPostId: 'tt-456',
          authorUsername: 'tokyoeats',
          originalUrl: 'https://tiktok.com/@tokyoeats/video/tt-456',
          caption: 'Top matcha spots in East Village!',
          locationName: 'Kyoto Tea House',
          mediaUrls: ['https://cdn.tiktok.com/video-2.mp4'],
          classification: 'restaurant_related',
          summary: 'Authentic Kyoto ceremonial matcha desserts',
        },
        postAttribution: {
          heroDish: 'Matcha Mille Crepe',
          vibeAnchor: 'Zen minimalist dessert cafe',
          courseCategory: 'dessert',
          walkInTips: null,
          vibeTags: ['Casual', 'Sweet Tooth', 'Minimalist'],
          recommendedDishes: ['Matcha Soft Serve', 'Ceremonial Latte'],
          creatorNotes: null,
        },
        guideIds: ['guide-nyc-desserts'],
        guides: [
          {
            id: 'guide-nyc-desserts',
            name: 'NYC Sweet Tooth',
            emojiIcon: '🍰',
          },
        ],
      },
    ];

    it('calculates unorganized and bookable counts accurately across all crumbs', () => {
      const { unorganizedCount, bookableCount } = filterCrumbs(mockCrumbs);
      expect(unorganizedCount).toBe(1); // crumb-1 has guideIds: []
      expect(bookableCount).toBe(1); // crumb-1 has resy reservationUrl
    });

    it('filters for unorganized crumbs (guideIds.length === 0)', () => {
      const { filtered } = filterCrumbs(mockCrumbs, { unorganized: true });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('crumb-1');
    });

    it('filters for bookable spots only', () => {
      const { filtered } = filterCrumbs(mockCrumbs, { bookable: true });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('crumb-1');
      expect(filtered[0].restaurant.reservationProvider).toBe('resy');
    });

    it('filters by neighborhood substring match in formattedAddress', () => {
      const { filtered } = filterCrumbs(mockCrumbs, {
        neighborhood: 'East Village',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('crumb-2');
    });
  });
});
