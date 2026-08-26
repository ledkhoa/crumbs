export interface CrumbFilterOptions {
  status?: 'inbox' | 'saved' | 'visited';
  guideId?: string;
  unorganized?: boolean;
  bookable?: boolean;
  neighborhood?: string;
  limit?: number;
  offset?: number;
}

export interface CrumbPostAttribution {
  heroDish: string | null;
  vibeAnchor: string | null;
  courseCategory: string | null;
  walkInTips: string | null;
  vibeTags: string[];
  recommendedDishes: string[];
  creatorNotes: string | null;
}

export interface EnrichedUserCrumb {
  id: string;
  userId: string;
  restaurantId: string;
  sourcePostId: string | null;
  status: string;
  isVisited: boolean;
  userNotes: string | null;
  userHeroDishOverride: string | null;
  effectiveHeroDish: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    googlePlaceId: string | null;
    name: string;
    formattedAddress: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    cuisine: string | null;
    rating: number | null;
    userRatingCount: number | null;
    priceLevel: string | null;
    mapsUrl: string | null;
    websiteUrl: string | null;
    photoUrl: string | null;
    editorialSummary: string | null;
    communityFavoriteDish: string | null;
    reservationUrl: string | null;
    reservationProvider: string | null;
  };
  sourcePost: {
    id: string;
    platform: string;
    postType: string;
    platformPostId: string | null;
    authorUsername: string | null;
    originalUrl: string;
    caption: string | null;
    locationName: string | null;
    mediaUrls: string[];
    classification: string | null;
    summary: string | null;
  } | null;
  postAttribution: CrumbPostAttribution | null;
  guideIds: string[];
  guides: Array<{
    id: string;
    name: string;
    emojiIcon: string;
  }>;
}

export interface ListCrumbsResponse {
  success: boolean;
  crumbs: EnrichedUserCrumb[];
  total: number;
  unorganizedCount: number;
  bookableCount: number;
}

export interface CrumbsCountsResponse {
  success: boolean;
  counts: {
    all: number;
    uncategorized: number;
  };
}

export interface UpdateCrumbInput {
  isVisited?: boolean;
  status?: 'inbox' | 'saved' | 'visited';
  userNotes?: string | null;
  userHeroDishOverride?: string | null;
}

export interface OpeningHoursInfo {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekdayDescriptions?: string[];
}

export interface CrumbDetail {
  id: string;
  isVisited: boolean;
  userNotes: string | null;
  userHeroDishOverride: string | null;
  effectiveHeroDish: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    googlePlaceId: string | null;
    name: string;
    formattedAddress: string | null;
    city: string | null;
    neighborhood: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    cuisine: string | null;
    rating: number | null;
    userRatingCount: number | null;
    priceLevel: string | null;
    mapsUrl: string | null;
    websiteUrl: string | null;
    photoUrl: string | null;
    editorialSummary: string | null;
    communityFavoriteDish: string | null;
    reservationUrl: string | null;
    reservationProvider: string | null;
    regularOpeningHours: OpeningHoursInfo | null;
  };
  sourcePost: {
    id: string;
    platform: string;
    authorUsername: string | null;
    originalUrl: string;
    mediaUrls: string[];
    caption: string | null;
    summary: string | null;
  } | null;
  postAttribution: CrumbPostAttribution | null;
  guides: Array<{
    id: string;
    name: string;
    emojiIcon: string;
  }>;
}
