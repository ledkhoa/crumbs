import type { ExtractedRestaurant } from '../services/ai';
import type { PlaceDetails } from '../services/places';

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
  guideId: string | null;
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
