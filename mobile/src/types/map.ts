import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export type LocationPermissionStatus =
  'undetermined' | 'granted' | 'denied' | 'restricted' | 'timeout_fallback';

export interface UserLocationState {
  coords: MapCoordinates | null;
  status: LocationPermissionStatus;
  isLoading: boolean;
  errorMessage: string | null;
}

export type MapQuickFilter = 'all' | 'open_now' | 'bookable' | 'visited';

export interface MapFilterState {
  searchQuery: string;
  selectedGuideId: string | null;
  quickFilter: MapQuickFilter;
}

export interface CrumbPinData {
  crumb: EnrichedUserCrumb;
  coordinate: MapCoordinates;
  heroEmoji: string;
  pinType: 'saved' | 'visited' | 'inbox';
}

export const DEFAULT_NYC_COORDINATES: MapRegion = {
  latitude: 40.7282,
  longitude: -73.9942,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

export const USER_NEIGHBORHOOD_ZOOM_DELTA = {
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};
