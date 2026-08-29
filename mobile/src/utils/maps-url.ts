export interface OpenMapsParams {
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  platform?: 'ios' | 'android' | 'web' | string;
}

/**
 * Pure URL builder that constructs native maps deep link schemes:
 * - iOS: `maps:0,0?q=...` (opens Apple Maps or default iOS maps handler)
 * - Android: `geo:0,0?q=...` (opens system default Android map app)
 * - Fallback / Web: `https://www.google.com/maps/search/?api=1&query=...`
 */
export function getMapsUrl({
  name,
  address,
  latitude,
  longitude,
  platform = 'ios',
}: OpenMapsParams): string {
  const query =
    [name, address].filter(Boolean).join(', ') ||
    address ||
    name ||
    'Restaurant';
  const encodedQuery = encodeURIComponent(query);

  if (platform === 'ios') {
    if (latitude != null && longitude != null) {
      return `maps:0,0?q=${encodedQuery}&ll=${latitude},${longitude}`;
    }
    return `maps:0,0?q=${encodedQuery}`;
  }

  if (platform === 'android') {
    if (latitude != null && longitude != null) {
      return `geo:${latitude},${longitude}?q=${encodedQuery}`;
    }
    return `geo:0,0?q=${encodedQuery}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}
