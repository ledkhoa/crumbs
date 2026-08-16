export interface PlaceDetails {
  placeId?: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  rating?: number;
}

/**
 * Resolves an extracted restaurant name and city/address into geographic coordinates
 * and verified place details.
 */
export async function resolvePlaceCoordinates(
  name: string,
  city?: string,
  address?: string,
  _apiKey?: string,
): Promise<PlaceDetails> {
  // Placeholder / mock resolver for now.
  // Can be plugged into Google Places API (New) or Mapbox Geocoding.
  const query = [name, address, city].filter(Boolean).join(', ');
  console.log(`[Places] Resolving place coordinates for: "${query}"`);

  return {
    name,
    formattedAddress: address || city,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  };
}
