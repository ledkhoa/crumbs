import type { OpeningHoursInfo } from '../../crumbs/crumbs.types';

export interface ReservationInfo {
  reservationUrl?: string;
  reservationProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom';
}

export interface PlaceDetails {
  placeId?: string;
  name: string;
  formattedAddress?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  websiteUrl?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photoUrl?: string;
  regularOpeningHours?: OpeningHoursInfo;
  editorialSummary?: string;
  communityFavoriteDish?: string;
  reservationUrl?: string;
  reservationProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom';
}

export interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

export interface GooglePlacesOpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open?: { day?: number; hour?: number; minute?: number };
    close?: { day?: number; hour?: number; minute?: number };
  }>;
  weekdayDescriptions?: string[];
}

interface GooglePlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    addressComponents?: AddressComponent[];
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    websiteUri?: string;
    priceLevel?: string;
    utcOffsetMinutes?: number;
    regularOpeningHours?: GooglePlacesOpeningHours;
    editorialSummary?: { text?: string; languageCode?: string };
    reviews?: Array<{
      text?: { text?: string; languageCode?: string };
      originalText?: { text?: string; languageCode?: string };
    }>;
    photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
  }>;
}

/**
 * Extracts a neighborhood with fallback to sublocality (e.g., Borough/District) from Google Places address components.
 */
export function extractNeighborhood(
  components?: AddressComponent[],
): string | undefined {
  if (!components || components.length === 0) return undefined;

  // 1. Direct neighborhood component (e.g., "West Village", "SoHo", "Shibuya")
  const neighborhoodComp = components.find((c) =>
    c.types?.includes('neighborhood'),
  );
  if (neighborhoodComp?.longText) return neighborhoodComp.longText;

  // 2. Sublocality fallback (e.g., "Manhattan", "Brooklyn", "Shinjuku City")
  const sublocalityComp = components.find(
    (c) =>
      c.types?.includes('sublocality_level_1') ||
      c.types?.includes('sublocality'),
  );
  if (sublocalityComp?.longText) return sublocalityComp.longText;

  return undefined;
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
): ReservationInfo {
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
 * Normalizes Google Places API (New) PriceLevel enums to standard dollar sign format ($, $$, $$$, $$$$, Free).
 */
export function formatPriceLevel(
  priceLevel?: string | number | null,
): string | undefined {
  if (priceLevel == null || priceLevel === '') return undefined;

  const normalized = String(priceLevel).trim().toUpperCase();

  switch (normalized) {
    case 'PRICE_LEVEL_FREE':
    case 'FREE':
    case '0':
      return 'Free';

    case 'PRICE_LEVEL_INEXPENSIVE':
    case 'INEXPENSIVE':
    case 'CHEAP':
    case '1':
    case '$':
      return '$';

    case 'PRICE_LEVEL_MODERATE':
    case 'MODERATE':
    case 'MEDIUM':
    case '2':
    case '$$':
      return '$$';

    case 'PRICE_LEVEL_EXPENSIVE':
    case 'EXPENSIVE':
    case '3':
    case '$$$':
      return '$$$';

    case 'PRICE_LEVEL_VERY_EXPENSIVE':
    case 'VERY_EXPENSIVE':
    case '4':
    case '$$$$':
      return '$$$$';

    default:
      if (/^\$+$/.test(normalized)) {
        return normalized;
      }
      return undefined;
  }
}

/**
 * Normalizes Google Places API (New) regularOpeningHours object into OpeningHoursInfo,
 * preserving utcOffsetMinutes, periods, and weekdayDescriptions.
 */
export function parseOpeningHours(
  rawHours?: GooglePlacesOpeningHours,
  utcOffsetMinutes?: number,
): OpeningHoursInfo | undefined {
  if (!rawHours) return undefined;

  return {
    utcOffsetMinutes,
    periods: rawHours.periods?.map((p) => ({
      open: {
        day: p.open?.day ?? 0,
        time:
          p.open?.hour !== undefined
            ? `${String(p.open.hour).padStart(2, '0')}:${String(p.open.minute || 0).padStart(2, '0')}`
            : '00:00',
      },
      close: p.close
        ? {
            day: p.close.day ?? 0,
            time:
              p.close.hour !== undefined
                ? `${String(p.close.hour).padStart(2, '0')}:${String(p.close.minute || 0).padStart(2, '0')}`
                : '00:00',
          }
        : undefined,
    })),
    weekdayDescriptions: rawHours.weekdayDescriptions,
  };
}

/**
 * Sanitizes and validates a candidate hero dish string, stripping trailing conversational clauses
 * and rejecting non-food sentiment phrases (e.g. "i've had in a while", "best food ever").
 */
export function sanitizeHeroDish(
  candidate?: string | null,
): string | undefined {
  if (!candidate) return undefined;

  const cleaned = candidate
    .trim()
    // Remove leading/trailing quotes and punctuation
    .replace(/^["'“‘\s]+|["'”’\s]+$/g, '')
    // Strip leading articles and superlatives ("the", "a", "an", "best", "our", "their")
    .replace(/^(?:the|a|an|our|their|best)\s+/i, '')
    // Strip trailing conversational relative clauses ("I've had in a while", "we ever had", "in my life", "in NYC")
    .replace(
      /(?:\s+(?:i've|we've|you've|i have|we have|they|i|we)\s+(?:had|eaten|tried|tasted|experienced|seen|ordered).*)$/i,
      '',
    )
    .replace(
      /(?:\s+in\s+(?:a\s+while|my\s+life|the\s+city|the\s+world|town|nyc|years|recent\s+memory).*)$/i,
      '',
    )
    .replace(
      /(?:\s+(?:ever|so\s+far|hands\s+down|to\s+die\s+for|on\s+earth).*)$/i,
      '',
    )
    .trim();

  // If candidate is too short or too long
  if (cleaned.length < 3 || cleaned.length > 45) {
    return undefined;
  }

  const lower = cleaned.toLowerCase();

  // Reject conversational pronouns, verbs, and generic non-dish junk
  const invalidPhrases = [
    /^i've\b/,
    /^we've\b/,
    /^you've\b/,
    /^it's\b/,
    /^there's\b/,
    /^had\b/,
    /^have\b/,
    /^was\b/,
    /^is\b/,
    /^so\s+good\b/,
    /^must\s+try\b/,
    /^must\s+order\b/,
    /^best\b/,
    /^in\s+a\s+while\b/,
    /\b(?:food|meal|dinner|lunch|breakfast|brunch|service|vibe|vibes|ambiance|atmosphere|experience|place|spot|restaurant)\b/,
    /^everything\b/,
    /^something\b/,
    /^nothing\b/,
    /^one\s+of\s+the\b/,
    /^all\s+the\s+dishes\b/,
  ];

  for (const pattern of invalidPhrases) {
    if (pattern.test(lower)) {
      return undefined;
    }
  }

  return cleaned;
}

/**
 * Extracts a community favorite dish from editorial summaries or review excerpts (Tier 2 Fallback).
 */
export function extractCommunityDishFromReviews(
  editorialSummary?: string,
  reviews?: Array<{
    text?: { text?: string; languageCode?: string };
    originalText?: { text?: string; languageCode?: string };
  }>,
): string | undefined {
  if (editorialSummary) {
    const dishMatch = editorialSummary.match(
      /(?:famous for(?: their| the)?|known for(?: their| the)?|signature|must-try|popular for|serves)\s+([A-Za-z\s'-]{3,40}?)(?:\.|,|\band\b|;|$)/i,
    );
    if (dishMatch && dishMatch[1]) {
      const sanitized = sanitizeHeroDish(dishMatch[1]);
      if (sanitized) {
        return sanitized;
      }
    }
  }

  if (reviews && reviews.length > 0) {
    for (const review of reviews) {
      const content = review.text?.text || review.originalText?.text;
      if (!content) continue;

      const patterns = [
        /(?:must order(?: the)?|definitely get(?: the)?|highlight was(?: the)?|signature dish is(?: the)?|favorite dish is(?: the)?|favorite dish was(?: the)?)\s+([A-Za-z\s'-]{3,35})(?:\.|!|,|;|\bbefore\b|\band\b|$)/i,
        /(?:ordered the|tried the|got the)\s+([A-Za-z\s'-]{3,30})(?:\.|!|,|;|\band\b|\bwhich\b|\bwhich was\b)/i,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const sanitized = sanitizeHeroDish(match[1]);
          if (sanitized) {
            return sanitized;
          }
        }
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
          'places.addressComponents',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
          'places.websiteUri',
          'places.priceLevel',
          'places.utcOffsetMinutes',
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
          // SAFETY: Google Places API searchText endpoint returns a response matching GooglePlacesSearchResponse schema
          const data = (await response.json()) as GooglePlacesSearchResponse;
          if (data.places && data.places.length > 0) {
            const place = data.places[0];
            const photoName = place.photos?.[0]?.name;
            const photoUrl = photoName
              ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${this.apiKey}`
              : undefined;

            const editorialSummary = place.editorialSummary?.text;
            const neighborhood = extractNeighborhood(place.addressComponents);
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

            const regularOpeningHours = parseOpeningHours(
              place.regularOpeningHours,
              place.utcOffsetMinutes,
            );

            return {
              placeId: place.id,
              name: place.displayName?.text || name,
              formattedAddress: place.formattedAddress || address || city,
              neighborhood,
              latitude: place.location?.latitude,
              longitude: place.location?.longitude,
              mapsUrl:
                place.googleMapsUri ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
              websiteUrl: place.websiteUri,
              rating: place.rating,
              userRatingCount: place.userRatingCount,
              priceLevel: formatPriceLevel(place.priceLevel),
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
