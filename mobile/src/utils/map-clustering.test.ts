import { describe, it, expect } from 'bun:test';
import {
  haversineDistanceMiles,
  getBoundingRegionForCoordinates,
  isCoordinateInRegion,
  pickRandomCraving,
} from './map-clustering';
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

describe('map-clustering utils', () => {
  describe('haversineDistanceMiles', () => {
    it('calculates distance between Soho and West Village correctly (~0.8 miles)', () => {
      const soho = { latitude: 40.7233, longitude: -74.003 };
      const westVillage = { latitude: 40.7358, longitude: -74.0036 };
      const dist = haversineDistanceMiles(
        soho.latitude,
        soho.longitude,
        westVillage.latitude,
        westVillage.longitude,
      );
      expect(dist).toBeGreaterThan(0.7);
      expect(dist).toBeLessThan(1.1);
    });

    it('returns 0 for identical coordinates', () => {
      const dist = haversineDistanceMiles(40.7282, -73.9942, 40.7282, -73.9942);
      expect(dist).toBe(0);
    });
  });

  describe('getBoundingRegionForCoordinates', () => {
    it('computes center and deltas with padding for multiple coordinates', () => {
      const coords = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.7589, longitude: -73.9851 },
      ];
      const region = getBoundingRegionForCoordinates(coords);
      expect(region.latitude).toBeCloseTo(40.7358, 2);
      expect(region.longitude).toBeCloseTo(-73.9955, 2);
      expect(region.latitudeDelta).toBeGreaterThan(0.046);
    });

    it('handles empty coordinates with default NYC region', () => {
      const region = getBoundingRegionForCoordinates([]);
      expect(region.latitude).toBeCloseTo(40.7282, 4);
      expect(region.longitude).toBeCloseTo(-73.9942, 4);
    });

    it('handles a single coordinate with zoom delta', () => {
      const region = getBoundingRegionForCoordinates([
        { latitude: 37.7749, longitude: -122.4194 },
      ]);
      expect(region.latitude).toBe(37.7749);
      expect(region.longitude).toBe(-122.4194);
      expect(region.latitudeDelta).toBe(0.035);
      expect(region.longitudeDelta).toBe(0.035);
    });
  });

  describe('isCoordinateInRegion', () => {
    it('returns true when coordinate is within bounds', () => {
      const region = {
        latitude: 40.7282,
        longitude: -73.9942,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
      expect(
        isCoordinateInRegion({ latitude: 40.728, longitude: -73.994 }, region),
      ).toBe(true);
      expect(
        isCoordinateInRegion({ latitude: 41.0, longitude: -73.994 }, region),
      ).toBe(false);
    });
  });

  describe('pickRandomCraving', () => {
    it('picks a crumb from the viewport if available', () => {
      const crumbIn = createMockCrumb({
        id: '1',
        restaurant: {
          id: 'rest-1',
          googlePlaceId: null,
          name: 'Crumb In',
          formattedAddress: null,
          city: null,
          neighborhood: null,
          state: null,
          country: null,
          latitude: 40.728,
          longitude: -73.994,
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
      });
      const crumbOut = createMockCrumb({
        id: '2',
        restaurant: {
          id: 'rest-2',
          googlePlaceId: null,
          name: 'Crumb Out',
          formattedAddress: null,
          city: null,
          neighborhood: null,
          state: null,
          country: null,
          latitude: 48.856,
          longitude: 2.352,
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
      });
      const region = {
        latitude: 40.7282,
        longitude: -73.9942,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
      const picked = pickRandomCraving([crumbIn, crumbOut], region);
      expect(picked?.id).toBe('1');
    });

    it('returns null if no crumbs are valid', () => {
      const picked = pickRandomCraving([]);
      expect(picked).toBeNull();
    });

    it('falls back to all crumbs if none in viewport', () => {
      const crumb1 = createMockCrumb({
        id: 'paris-1',
        restaurant: {
          id: 'rest-paris',
          googlePlaceId: null,
          name: 'Paris Crumb',
          formattedAddress: null,
          city: null,
          neighborhood: null,
          state: null,
          country: null,
          latitude: 48.856,
          longitude: 2.352,
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
      });
      const region = {
        latitude: 40.7282,
        longitude: -73.9942,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
      const picked = pickRandomCraving([crumb1], region);
      expect(picked?.id).toBe('paris-1');
    });
  });
});
