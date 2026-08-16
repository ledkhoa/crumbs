export interface PlaceDetails {
  placeId?: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photoUrl?: string;
  isOpenNow?: boolean;
}

interface GooglePlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    websiteUri?: string;
    priceLevel?: string;
    currentOpeningHours?: { openNow?: boolean };
    photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
  }>;
}

/**
 * PlacesService handles place search, geocoding, and place details enrichment via Google Places API (New).
 */
export class PlacesService {
  constructor(private apiKey?: string) {}

  /**
   * Resolves an extracted restaurant name and city/address into geographic coordinates
   * and verified place details.
   */
  async resolve(
    name: string,
    city?: string,
    address?: string,
  ): Promise<PlaceDetails> {
    const query = [name, address, city].filter(Boolean).join(', ');

    if (this.apiKey) {
      try {
        console.log(
          `[PlacesService] Querying Google Places API (New) for: "${query}"`,
        );

        const fieldMask = [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
          'places.websiteUri',
          'places.priceLevel',
          'places.currentOpeningHours',
          'places.photos',
        ].join(',');

        const response = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': fieldMask,
            },
            body: JSON.stringify({
              textQuery: query,
              maxResultCount: 1,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(
            `[PlacesService] Google Places API returned HTTP ${response.status}: ${errorText}`,
          );
        } else {
          const data = (await response.json()) as GooglePlacesSearchResponse;
          if (data.places && data.places.length > 0) {
            const place = data.places[0];
            const photoName = place.photos?.[0]?.name;
            const photoUrl = photoName
              ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${this.apiKey}`
              : undefined;

            return {
              placeId: place.id,
              name: place.displayName?.text || name,
              formattedAddress: place.formattedAddress || address || city,
              latitude: place.location?.latitude,
              longitude: place.location?.longitude,
              mapsUrl:
                place.googleMapsUri ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
              websiteUrl: place.websiteUri,
              rating: place.rating,
              userRatingCount: place.userRatingCount,
              priceLevel: place.priceLevel,
              photoUrl,
              isOpenNow: place.currentOpeningHours?.openNow,
            };
          }
        }
      } catch (error) {
        console.warn(
          `[PlacesService] Failed to resolve places via Google Places API:`,
          error,
        );
      }
    }

    // Fallback / simulated resolver for local development
    console.log(
      `[PlacesService] Using fallback place resolver (no API key configured)`,
    );

    return {
      name,
      formattedAddress: address || city,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    };
  }
}
