import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import {
  DEFAULT_NYC_COORDINATES,
  USER_NEIGHBORHOOD_ZOOM_DELTA,
  type MapCoordinates,
  type MapRegion,
} from '@/types/map';

/**
 * Haversine formula for distance calculation between two lat/lng coordinates in miles.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth's radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates a MapRegion bounding box encompassing all supplied coordinates with padding.
 */
export function getBoundingRegionForCoordinates(
  coordinates: MapCoordinates[],
  paddingFactor = 1.25,
): MapRegion {
  if (coordinates.length === 0) {
    return DEFAULT_NYC_COORDINATES;
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.latitudeDelta,
      longitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.longitudeDelta,
    };
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  for (let i = 1; i < coordinates.length; i++) {
    const c = coordinates[i];
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * paddingFactor, 0.02);
  const lngDelta = Math.max((maxLng - minLng) * paddingFactor, 0.02);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Determines whether a coordinate lies within the given visible MapRegion.
 */
export function isCoordinateInRegion(
  coord: MapCoordinates,
  region: MapRegion,
): boolean {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  return (
    coord.latitude >= region.latitude - halfLat &&
    coord.latitude <= region.latitude + halfLat &&
    coord.longitude >= region.longitude - halfLng &&
    coord.longitude <= region.longitude + halfLng
  );
}

/**
 * Randomly selects a crumb from the crumbs currently visible inside the viewport.
 * If none visible, selects from all available crumbs.
 */
export function pickRandomCraving(
  crumbs: EnrichedUserCrumb[],
  currentRegion?: MapRegion | null,
): EnrichedUserCrumb | null {
  const validCrumbs = crumbs.filter(
    (c) =>
      Number.isFinite(c.restaurant?.latitude) &&
      Number.isFinite(c.restaurant?.longitude),
  );

  if (validCrumbs.length === 0) {
    return null;
  }

  if (currentRegion) {
    const viewportCrumbs = validCrumbs.filter((c) =>
      isCoordinateInRegion(
        {
          latitude: c.restaurant.latitude!,
          longitude: c.restaurant.longitude!,
        },
        currentRegion,
      ),
    );

    if (viewportCrumbs.length > 0) {
      const randomIndex = Math.floor(Math.random() * viewportCrumbs.length);
      return viewportCrumbs[randomIndex];
    }
  }

  const randomIndex = Math.floor(Math.random() * validCrumbs.length);
  return validCrumbs[randomIndex];
}
