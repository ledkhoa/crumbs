import type { ExtractedRestaurant } from './services/ai.service';
import type { PlaceDetails } from './services/places.service';

/**
 * An extracted restaurant entity combined with resolved Google Places metadata.
 */
export interface EnrichedRestaurant extends ExtractedRestaurant {
  placeDetails: PlaceDetails;
}

/**
 * Cloudflare R2 media snapshot metadata.
 */
export interface MediaSnapshot {
  originalUrl: string | null;
  r2Key: string | null;
  status: 'pending_r2_setup' | 'cached';
}

/**
 * The finalized structured crumb payload produced by IngestWorkflow.
 */
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
  mediaSnapshot: MediaSnapshot;
  classification:
    | 'restaurant_related'
    | 'travel_unrelated_to_restaurants'
    | 'random_unrelated';
  summary: string;
  restaurants: EnrichedRestaurant[];
  processedAt: string;
}

/**
 * Clean, lightweight restaurant representation returned by Fast-Path cache hit.
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
 * Clean, lightweight post representation returned by Fast-Path cache hit.
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

export interface CachedIngestResponse {
  success: true;
  workflowId: string;
  status: 'complete';
  cached: true;
  post: CachedPostSummary;
  restaurants: CachedRestaurantSummary[];
  message: string;
}
