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
  regularOpeningHours?: Array<{ open?: string; close?: string; day?: number }>;
  editorialSummary?: string;
  communityFavoriteDish?: string;
  reservationUrl?: string;
  reservationProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom';
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
    regularOpeningHours?: {
      periods?: Array<{
        open?: { day?: number; hour?: number; minute?: number };
        close?: { day?: number; hour?: number; minute?: number };
      }>;
    };
    editorialSummary?: { text?: string; languageCode?: string };
    reviews?: Array<{
      text?: { text?: string; languageCode?: string };
      originalText?: { text?: string; languageCode?: string };
    }>;
    photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
  }>;
}

/**
 * Detects reservation provider and direct reservation URL from website, caption hints, or smart deeplinks.
 */
export function detectReservationProvider(
  websiteUrl?: string,
  explicitProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom',
  explicitUrl?: string,
  restaurantName?: string,
  city?: string,
): {
  reservationUrl?: string;
  reservationProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom';
} {
  // 1. Explicit Direct URL (e.g. from creator caption)
  if (explicitUrl) {
    return {
      reservationUrl: explicitUrl,
      reservationProvider: explicitProvider || 'custom',
    };
  }

  // 2. Detected from Website URL
  if (websiteUrl) {
    const lower = websiteUrl.toLowerCase();
    if (lower.includes('resy.com')) {
      return { reservationUrl: websiteUrl, reservationProvider: 'resy' };
    }
    if (lower.includes('opentable.com')) {
      return { reservationUrl: websiteUrl, reservationProvider: 'opentable' };
    }
    if (lower.includes('sevenrooms.com')) {
      return { reservationUrl: websiteUrl, reservationProvider: 'sevenrooms' };
    }
    if (lower.includes('exploretock.com') || lower.includes('tock.com')) {
      return { reservationUrl: websiteUrl, reservationProvider: 'tock' };
    }
  }

  // 3. Explicit Provider Name Mentioned in Creator Caption/Tips -> Smart Deep Link
  if (explicitProvider && restaurantName) {
    const query = encodeURIComponent(
      [restaurantName, city].filter(Boolean).join(' '),
    );
    if (explicitProvider === 'resy') {
      return {
        reservationUrl: `https://resy.com/cities/search?query=${query}`,
        reservationProvider: 'resy',
      };
    }
    if (explicitProvider === 'opentable') {
      return {
        reservationUrl: `https://www.opentable.com/s?term=${query}`,
        reservationProvider: 'opentable',
      };
    }
    if (explicitProvider === 'tock') {
      return {
        reservationUrl: `https://www.exploretock.com/search?query=${query}`,
        reservationProvider: 'tock',
      };
    }
    if (explicitProvider === 'sevenrooms') {
      return {
        reservationUrl: `https://www.google.com/search?q=${query}+sevenrooms+reservation`,
        reservationProvider: 'sevenrooms',
      };
    }
  }

  // 4. Default: No reservation platform known -> UI falls back to restaurant websiteUrl or mapsUrl
  return {};
}

/**
 * Extracts a community favorite dish from editorial summaries or review excerpts (Tier 2 Fallback).
 */
export function extractCommunityDishFromReviews(
  editorialSummary?: string,
  reviews?: Array<{
    text?: { text?: string };
    originalText?: { text?: string };
  }>,
): string | undefined {
  if (editorialSummary) {
    const dishMatch = editorialSummary.match(
      /(?:famous for|known for|serves|specialty is|must-try|signature|popular for)\s+([^.,;]+)/i,
    );
    if (dishMatch && dishMatch[1]) {
      return dishMatch[1].trim().replace(/^their\s+/i, '');
    }
  }

  if (reviews && reviews.length > 0) {
    for (const review of reviews) {
      const reviewText = review.text?.text || review.originalText?.text || '';
      const reviewMatch = reviewText.match(
        /(?:must order|must try|best dish was|get the|signature)\s+([A-Z][a-z]+(?:\s+[A-Za-z]+){1,3})/i,
      );
      if (reviewMatch && reviewMatch[1]) {
        return reviewMatch[1].trim();
      }
    }
  }

  return undefined;
}

/**
 * PlacesService handles place search, geocoding, and place details enrichment via Google Places API (New).
 */
export class PlacesService {
  constructor(private apiKey?: string) {}

  /**
   * Resolves an extracted restaurant name and city/address into geographic coordinates,
   * verified place details, reservation links, and Tier 2 community favorite dish fallback.
   */
  async resolve(
    name: string,
    city?: string,
    address?: string,
    heroDishProvided?: boolean,
    explicitReservationProvider?:
      'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom',
    explicitReservationUrl?: string,
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
          'places.regularOpeningHours',
          'places.editorialSummary',
          'places.reviews',
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

            const editorialSummary = place.editorialSummary?.text;
            const reservationInfo = detectReservationProvider(
              place.websiteUri,
              explicitReservationProvider,
              explicitReservationUrl,
              place.displayName?.text || name,
              city,
            );

            // Tier 2 Fallback: If no hero dish was extracted from the social post, extract from reviews
            const communityFavoriteDish = !heroDishProvided
              ? extractCommunityDishFromReviews(editorialSummary, place.reviews)
              : undefined;

            const regularOpeningHours = place.regularOpeningHours?.periods?.map(
              (p) => ({
                day: p.open?.day,
                open:
                  p.open?.hour !== undefined
                    ? `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute || 0).padStart(2, '0')}`
                    : undefined,
                close:
                  p.close?.hour !== undefined
                    ? `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute || 0).padStart(2, '0')}`
                    : undefined,
              }),
            );

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
              regularOpeningHours,
              editorialSummary,
              communityFavoriteDish,
              ...reservationInfo,
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
