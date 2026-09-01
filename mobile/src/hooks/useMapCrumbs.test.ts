import { describe, it, expect } from 'bun:test';
import {
  deduceHeroEmoji,
  getCrumbPinType,
  filterCrumbs,
} from '@/utils/map-filter';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

function createMockCrumb(
  overrides: Partial<EnrichedUserCrumb>,
): EnrichedUserCrumb {
  return {
    id: 'mock-crumb',
    userId: 'user-1',
    restaurantId: 'rest-1',
    sourcePostId: null,
    status: 'saved',
    isVisited: false,
    userNotes: null,
    userHeroDishOverride: null,
    effectiveHeroDish: null,
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
    restaurant: {
      id: 'rest-1',
      googlePlaceId: null,
      name: 'Mock Place',
      formattedAddress: null,
      city: null,
      neighborhood: null,
      state: null,
      country: null,
      latitude: 40.7282,
      longitude: -73.9942,
      cuisine: null,
      rating: null,
      userRatingCount: null,
      priceLevel: null,
      mapsUrl: null,
      websiteUrl: null,
      photoUrl: null,
      editorialSummary: null,
      communityFavoriteDish: null,
      reservationUrl: null,
      reservationProvider: null,
      regularOpeningHours: null,
      ...overrides.restaurant,
    },
    sourcePost: null,
    postAttribution: null,
    guideIds: [],
    guides: [],
    ...overrides,
  };
}

describe('useMapCrumbs filtering & emoji logic', () => {
  const sampleCrumbs: EnrichedUserCrumb[] = [
    createMockCrumb({
      id: 'crumb-1',
      userId: 'user-1',
      status: 'saved',
      isVisited: false,
      guideIds: ['guide-101'],
      effectiveHeroDish: 'Cacio e Pepe Tagliatelle',
      restaurant: {
        id: 'rest-1',
        googlePlaceId: null,
        name: 'Via Carota',
        cuisine: 'Italian',
        formattedAddress: '51 Grove St, New York, NY 10014',
        neighborhood: 'West Village',
        city: 'New York',
        state: 'NY',
        country: 'US',
        latitude: 40.7337,
        longitude: -74.0041,
        rating: 4.8,
        userRatingCount: 500,
        priceLevel: '3',
        mapsUrl: null,
        websiteUrl: null,
        photoUrl: null,
        editorialSummary: null,
        communityFavoriteDish: null,
        reservationUrl: 'https://resy.com/cities/ny/via-carota',
        reservationProvider: 'resy',
        regularOpeningHours: null,
      },
      postAttribution: {
        heroDish: 'Cacio e Pepe',
        vibeAnchor: null,
        courseCategory: null,
        walkInTips: null,
        vibeTags: ['Romantic', 'Cozy'],
        recommendedDishes: [],
        creatorNotes: null,
      },
    }),
    createMockCrumb({
      id: 'crumb-2',
      userId: 'user-1',
      status: 'visited',
      isVisited: true,
      guideIds: ['guide-102'],
      effectiveHeroDish: 'Almond Croissant',
      restaurant: {
        id: 'rest-2',
        googlePlaceId: null,
        name: 'Librae Bakery',
        cuisine: 'Bakery & Cafe',
        formattedAddress: '35 3rd Ave, New York, NY 10003',
        neighborhood: 'East Village',
        city: 'New York',
        state: 'NY',
        country: 'US',
        latitude: 40.7297,
        longitude: -73.9898,
        rating: 4.7,
        userRatingCount: 300,
        priceLevel: '2',
        mapsUrl: null,
        websiteUrl: null,
        photoUrl: null,
        editorialSummary: null,
        communityFavoriteDish: null,
        reservationUrl: null,
        reservationProvider: null,
        regularOpeningHours: null,
      },
      postAttribution: {
        heroDish: 'Almond Croissant',
        vibeAnchor: null,
        courseCategory: null,
        walkInTips: null,
        vibeTags: ['Pastry', 'Morning Coffee'],
        recommendedDishes: [],
        creatorNotes: null,
      },
    }),
    createMockCrumb({
      id: 'crumb-3',
      userId: 'user-1',
      status: 'inbox',
      isVisited: false,
      guideIds: [],
      restaurant: {
        id: 'rest-3',
        googlePlaceId: null,
        name: 'Taqueria Ramirez',
        cuisine: 'Mexican',
        formattedAddress: '94 Franklin St, Brooklyn, NY 11222',
        neighborhood: 'Greenpoint',
        city: 'New York',
        state: 'NY',
        country: 'US',
        latitude: 40.7289,
        longitude: -73.9576,
        rating: 4.6,
        userRatingCount: 200,
        priceLevel: '1',
        mapsUrl: null,
        websiteUrl: null,
        photoUrl: null,
        editorialSummary: null,
        communityFavoriteDish: null,
        reservationUrl: null,
        reservationProvider: null,
        regularOpeningHours: null,
      },
    }),
    createMockCrumb({
      id: 'crumb-invalid-coords',
      userId: 'user-1',
      status: 'saved',
      isVisited: false,
      guideIds: [],
      restaurant: {
        id: 'rest-4',
        googlePlaceId: null,
        name: 'Unknown Place',
        formattedAddress: null,
        city: null,
        neighborhood: null,
        state: null,
        country: null,
        latitude: null,
        longitude: null,
        cuisine: null,
        rating: null,
        userRatingCount: null,
        priceLevel: null,
        mapsUrl: null,
        websiteUrl: null,
        photoUrl: null,
        editorialSummary: null,
        communityFavoriteDish: null,
        reservationUrl: null,
        reservationProvider: null,
        regularOpeningHours: null,
      },
    }),
  ];

  describe('deduceHeroEmoji', () => {
    it('deduces pasta emoji for Italian pasta dishes', () => {
      expect(deduceHeroEmoji(sampleCrumbs[0])).toBe('🍝');
    });

    it('deduces croissant emoji for bakery items', () => {
      expect(deduceHeroEmoji(sampleCrumbs[1])).toBe('🥐');
    });

    it('deduces taco emoji for Mexican cuisine', () => {
      expect(deduceHeroEmoji(sampleCrumbs[2])).toBe('🌮');
    });

    it('returns default fork & knife emoji when no keywords match', () => {
      const crumb = createMockCrumb({
        effectiveHeroDish: 'House Salad',
        restaurant: {
          id: 'rest-salad',
          googlePlaceId: null,
          name: 'Simple Greens',
          cuisine: 'Healthy',
          formattedAddress: null,
          city: null,
          neighborhood: null,
          state: null,
          country: null,
          latitude: 40.72,
          longitude: -73.99,
          rating: null,
          userRatingCount: null,
          priceLevel: null,
          mapsUrl: null,
          websiteUrl: null,
          photoUrl: null,
          editorialSummary: null,
          communityFavoriteDish: null,
          reservationUrl: null,
          reservationProvider: null,
          regularOpeningHours: null,
        },
      });
      expect(deduceHeroEmoji(crumb)).toBe('🍴');
    });
  });

  describe('getCrumbPinType', () => {
    it('identifies visited crumbs regardless of guide association', () => {
      expect(getCrumbPinType(sampleCrumbs[1])).toBe('visited');
      expect(
        getCrumbPinType(
          createMockCrumb({
            status: 'visited',
            isVisited: true,
            guideIds: [],
          }),
        ),
      ).toBe('visited');
    });

    it('identifies inbox / unorganized crumbs (guideIds empty)', () => {
      expect(getCrumbPinType(sampleCrumbs[2])).toBe('inbox');
      expect(
        getCrumbPinType(
          createMockCrumb({
            status: 'saved',
            isVisited: false,
            guideIds: [],
          }),
        ),
      ).toBe('inbox');
    });

    it('identifies saved organized crumbs (guideIds not empty)', () => {
      expect(getCrumbPinType(sampleCrumbs[0])).toBe('saved');
      expect(
        getCrumbPinType(
          createMockCrumb({
            status: 'inbox',
            isVisited: false,
            guideIds: ['guide-123'],
          }),
        ),
      ).toBe('saved');
    });
  });

  describe('filterCrumbs', () => {
    it('filters out crumbs with invalid coordinates', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).not.toContain('crumb-invalid-coords');
    });

    it('filters by search query matching restaurant name', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: 'via carota',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-1');
    });

    it('filters by search query matching hero dish', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: 'croissant',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-2');
    });

    it('filters by search query matching vibe tags', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: 'romantic',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-1');
    });

    it('filters by selected guide ID via guideIds or guides summary list', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: 'guide-101',
        quickFilter: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-1');

      const crumbWithGuideObject = createMockCrumb({
        id: 'crumb-guide-obj',
        guideIds: [],
        guides: [
          {
            id: 'guide-custom-1',
            name: 'Pizza Tour',
            emojiIcon: '🍕',
          },
        ],
      });
      const resultObj = filterCrumbs([crumbWithGuideObject], {
        searchQuery: '',
        selectedGuideId: 'guide-custom-1',
        quickFilter: 'all',
      });
      expect(resultObj).toHaveLength(1);
      expect(resultObj[0].id).toBe('crumb-guide-obj');
    });

    it('filters by uncategorized to show only crumbs with no guides', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: 'uncategorized',
        quickFilter: 'all',
      });
      // sampleCrumbs: crumb-1 has guideIds: ['guide-101'], crumb-2 has guideIds: ['guide-102'], crumb-3 has guideIds: []
      expect(result).toHaveLength(1);
      expect(result.map((c) => c.id)).toEqual(['crumb-3']);
    });

    it('correctly handles string and numeric coordinates without dropping crumbs', () => {
      const mockCrumb = createMockCrumb({
        id: 'crumb-str-coords',
      });
      // Emulate untyped JSON server response where latitude/longitude arrive as decimal strings
      Object.assign(mockCrumb.restaurant, {
        latitude: '40.7128',
        longitude: '-74.0060',
      });

      const result = filterCrumbs([mockCrumb], {
        searchQuery: '',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-str-coords');
    });

    it('filters by bookable quick filter', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: null,
        quickFilter: 'bookable',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-1');
    });

    it('filters by visited quick filter', () => {
      const result = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: null,
        quickFilter: 'visited',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-2');
    });

    it('filters by open_now quick filter when regularOpeningHours indicate open/closed', () => {
      const openCrumb = createMockCrumb({
        id: 'crumb-open',
        restaurant: {
          id: 'rest-open',
          googlePlaceId: null,
          name: 'Always Open Deli',
          formattedAddress: '100 Main St',
          city: 'New York',
          neighborhood: 'East Village',
          state: 'NY',
          country: 'US',
          latitude: 40.7282,
          longitude: -73.9942,
          cuisine: 'Deli',
          rating: null,
          userRatingCount: null,
          priceLevel: null,
          mapsUrl: null,
          websiteUrl: null,
          photoUrl: null,
          editorialSummary: null,
          communityFavoriteDish: null,
          reservationUrl: null,
          reservationProvider: null,
          regularOpeningHours: {
            periods: [
              {
                open: { day: 0, time: '0000' },
              },
            ],
            weekdayDescriptions: ['Open 24/7'],
          },
        },
      });

      const closedCrumb = createMockCrumb({
        id: 'crumb-closed',
        restaurant: {
          id: 'rest-closed',
          googlePlaceId: null,
          name: 'Closed Cafe',
          formattedAddress: '102 Main St',
          city: 'New York',
          neighborhood: 'East Village',
          state: 'NY',
          country: 'US',
          latitude: 40.7285,
          longitude: -73.9945,
          cuisine: 'Cafe',
          rating: null,
          userRatingCount: null,
          priceLevel: null,
          mapsUrl: null,
          websiteUrl: null,
          photoUrl: null,
          editorialSummary: null,
          communityFavoriteDish: null,
          reservationUrl: null,
          reservationProvider: null,
          regularOpeningHours: null,
        },
      });

      const result = filterCrumbs([openCrumb, closedCrumb], {
        searchQuery: '',
        selectedGuideId: null,
        quickFilter: 'open_now',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('crumb-open');
    });

    it('filters by search query matching neighborhood and cuisine', () => {
      const resultNeighborhood = filterCrumbs(sampleCrumbs, {
        searchQuery: 'greenpoint',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(resultNeighborhood).toHaveLength(1);
      expect(resultNeighborhood[0].id).toBe('crumb-3');

      const resultCuisine = filterCrumbs(sampleCrumbs, {
        searchQuery: 'mexican',
        selectedGuideId: null,
        quickFilter: 'all',
      });
      expect(resultCuisine).toHaveLength(1);
      expect(resultCuisine[0].id).toBe('crumb-3');
    });

    it('filters by multiple quick filters simultaneously using AND logic', () => {
      // sampleCrumbs:
      // crumb-1: bookable (has reservationUrl), not visited (isVisited: false)
      // crumb-2: not bookable, visited (isVisited: true)
      // crumb-3: not bookable, not visited

      const bookableAndVisited = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: null,
        quickFilters: ['bookable', 'visited'],
      });
      expect(bookableAndVisited).toHaveLength(0);

      const bookableOnly = filterCrumbs(sampleCrumbs, {
        searchQuery: '',
        selectedGuideId: null,
        quickFilters: ['bookable'],
      });
      expect(bookableOnly).toHaveLength(1);
      expect(bookableOnly[0].id).toBe('crumb-1');

      // Now create a crumb that is both bookable and visited
      const bookableAndVisitedCrumb = createMockCrumb({
        id: 'crumb-both',
        isVisited: true,
        restaurant: {
          id: 'rest-both',
          googlePlaceId: null,
          name: 'Both Deli',
          formattedAddress: '200 Main St',
          city: 'New York',
          neighborhood: 'East Village',
          state: 'NY',
          country: 'US',
          latitude: 40.7285,
          longitude: -73.9945,
          cuisine: 'Italian',
          rating: null,
          userRatingCount: null,
          priceLevel: null,
          mapsUrl: null,
          websiteUrl: null,
          photoUrl: null,
          editorialSummary: null,
          communityFavoriteDish: null,
          reservationUrl: 'https://resy.com/cities/ny/both',
          reservationProvider: 'resy',
          regularOpeningHours: null,
        },
      });

      const multiMatch = filterCrumbs(
        [...sampleCrumbs, bookableAndVisitedCrumb],
        {
          searchQuery: '',
          selectedGuideId: null,
          quickFilters: ['bookable', 'visited'],
        },
      );
      expect(multiMatch).toHaveLength(1);
      expect(multiMatch[0].id).toBe('crumb-both');
    });
  });
});
