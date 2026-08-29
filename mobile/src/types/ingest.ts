export type IngestionStepId = 'capturing' | 'analyzing' | 'matching' | 'saved';

export type IngestionStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface IngestionStep {
  id: IngestionStepId;
  label: string;
  sublabel?: string;
  status: IngestionStepStatus;
  elapsedMs?: number;
}

export interface OpeningHoursInfo {
  utcOffsetMinutes?: number;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekdayDescriptions?: string[];
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

export interface PostAttribution {
  heroDish?: string | null;
  vibeAnchor?: string | null;
  courseCategory?: string | null;
  walkInTips?: string | null;
  vibeTags: string[];
  recommendedDishes: string[];
  creatorNotes?: string | null;
}

export interface EnrichedRestaurant {
  id?: string;
  name: string;
  cuisine?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  heroDish?: string;
  vibeAnchor?: string;
  courseCategory?:
    'aperitif' | 'main' | 'dessert' | 'cafe_bakery' | 'cocktail_bar' | 'snack';
  walkInTips?: string;
  reservationProvider?: 'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom';
  reservationUrl?: string;
  vibeTags: string[];
  recommendedDishes: string[];
  notes?: string;
  placeDetails: PlaceDetails;
}

export interface ProcessedCrumbPayload {
  url: string;
  userId: string | null;
  platform: 'instagram' | 'tiktok' | 'unknown';
  postType: 'reel' | 'carousel' | 'post' | 'video' | 'unknown';
  platformPostId: string | null;
  authorUsername?: string | null;
  caption: string;
  locationName: string | null;
  mediaUrls: string[];
  classification:
    | 'restaurant_related'
    | 'travel_unrelated_to_restaurants'
    | 'random_unrelated';
  summary: string;
  restaurants: EnrichedRestaurant[];
  processedAt: string;
}

/**
 * Normalized representation of a single restaurant spot extracted from an ingestion payload.
 * Unifies both Fast-Path Cache Hit and Async Cloudflare Workflow output formats.
 */
export interface UnifiedRestaurantSpot {
  id?: string;
  crumbId?: string;
  name: string;
  googlePlaceId?: string | null;
  formattedAddress: string;
  neighborhood?: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  priceLevel?: string | null;
  photoUrl?: string | null;
  mapsUrl?: string | null;
  websiteUrl?: string | null;
  reservationUrl?: string | null;
  reservationProvider?: string | null;
  heroDish?: string | null;
  vibeAnchor?: string | null;
  courseCategory?: string | null;
  walkInTips?: string | null;
  vibeTags: string[];
  recommendedDishes: string[];
  editorialSummary?: string | null;
}

/**
 * Clean, lightweight restaurant summary returned by Fast-Path cache hit.
 */
export interface CachedRestaurantSummary {
  id: string;
  crumbId?: string;
  name: string;
  formattedAddress: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rating: number | null;
  priceLevel: string | null;
  photoUrl: string | null;
  heroDish: string | null;
  vibeAnchor: string | null;
  vibeTags: string[];
  walkInTips: string | null;
  mapsUrl: string | null;
  websiteUrl: string | null;
  reservationUrl: string | null;
  reservationProvider: string | null;
}

/**
 * Clean, lightweight post summary returned by Fast-Path cache hit.
 */
export interface CachedPostSummary {
  id: string;
  authorUsername: string | null;
  platform: 'instagram' | 'tiktok' | 'unknown';
  originalUrl: string;
  caption: string;
  classification:
    | 'restaurant_related'
    | 'travel_unrelated_to_restaurants'
    | 'random_unrelated';
  summary: string;
  mediaSnapshot: string | null;
}

/**
 * Finalized UI payload consumed by IngestionOverlaySheet and child views.
 */
export interface UnifiedIngestionResult {
  sourceUrl: string;
  authorUsername?: string | null;
  caption?: string;
  classification:
    | 'restaurant_related'
    | 'travel_unrelated_to_restaurants'
    | 'random_unrelated';
  summary: string;
  isCachedHit: boolean;
  spots: UnifiedRestaurantSpot[];
}
