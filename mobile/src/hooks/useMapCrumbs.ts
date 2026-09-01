import { useState, useMemo, useCallback } from 'react';
import { useCrumbsQuery } from '@/hooks/useCrumbs';
import { useGuidesQuery } from '@/hooks/useGuides';
import {
  deduceHeroEmoji,
  getCrumbPinType,
  filterCrumbs,
} from '@/utils/map-filter';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import type {
  CrumbPinData,
  MapCoordinates,
  MapQuickFilter,
  MapFilterState,
} from '@/types/map';

export { deduceHeroEmoji, getCrumbPinType, filterCrumbs };

export interface GuideSummary {
  id: string;
  name: string;
  emojiIcon: string;
  crumbCount?: number;
}

export interface UseMapCrumbsResult {
  allSavedCrumbs: EnrichedUserCrumb[];
  filteredCrumbs: EnrichedUserCrumb[];
  pinData: CrumbPinData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGuideId: string | null;
  setSelectedGuideId: (guideId: string | null) => void;
  quickFilter: MapQuickFilter;
  setQuickFilter: (filter: MapQuickFilter) => void;
  filterState: MapFilterState;
  guides: GuideSummary[];
}

export function useMapCrumbs(
  initialFilters?: Partial<MapFilterState>,
): UseMapCrumbsResult {
  const [searchQuery, setSearchQuery] = useState(
    initialFilters?.searchQuery || '',
  );
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(
    initialFilters?.selectedGuideId || null,
  );
  const [quickFilter, setQuickFilter] = useState<MapQuickFilter>(
    initialFilters?.quickFilter || 'all',
  );

  const {
    data: crumbsData,
    isLoading: isCrumbsLoading,
    isError: isCrumbsError,
    error: crumbsError,
    refetch: refetchCrumbs,
  } = useCrumbsQuery();

  const {
    data: guidesData,
    isLoading: isGuidesLoading,
    refetch: refetchGuides,
  } = useGuidesQuery();

  const rawCrumbs = useMemo(() => {
    if (!crumbsData?.crumbs) return [];
    // SAFETY: apiClient.crumbs.$get returns EnrichedUserCrumb array in crumbs field
    return crumbsData.crumbs as EnrichedUserCrumb[];
  }, [crumbsData]);

  const allSavedCrumbs = useMemo(() => {
    return rawCrumbs.filter((c) => {
      const lat = Number(c.restaurant?.latitude);
      const lng = Number(c.restaurant?.longitude);
      return (
        Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
      );
    });
  }, [rawCrumbs]);

  const filteredCrumbs = useMemo(() => {
    return filterCrumbs(allSavedCrumbs, {
      searchQuery,
      selectedGuideId,
      quickFilter,
    });
  }, [allSavedCrumbs, searchQuery, selectedGuideId, quickFilter]);

  const pinData = useMemo<CrumbPinData[]>(() => {
    return filteredCrumbs.map((crumb) => {
      const coordinate: MapCoordinates = {
        latitude: Number(crumb.restaurant.latitude),
        longitude: Number(crumb.restaurant.longitude),
      };
      return {
        crumb,
        coordinate,
        heroEmoji: deduceHeroEmoji(crumb),
        pinType: getCrumbPinType(crumb),
      };
    });
  }, [filteredCrumbs]);

  const guides = useMemo<GuideSummary[]>(() => {
    if (!guidesData) return [];
    // SAFETY: apiClient.guides.$get returns Guide array with id, name, emojiIcon, and crumbCount
    return (
      guidesData as Array<{
        id: string;
        name: string;
        emojiIcon?: string;
        crumbCount?: number;
      }>
    ).map((g) => ({
      id: g.id,
      name: g.name,
      emojiIcon: g.emojiIcon || '📑',
      crumbCount: g.crumbCount,
    }));
  }, [guidesData]);

  const refetch = useCallback(() => {
    refetchCrumbs();
    refetchGuides();
  }, [refetchCrumbs, refetchGuides]);

  const filterState = useMemo<MapFilterState>(
    () => ({
      searchQuery,
      selectedGuideId,
      quickFilter,
    }),
    [searchQuery, selectedGuideId, quickFilter],
  );

  return {
    allSavedCrumbs,
    filteredCrumbs,
    pinData,
    isLoading: isCrumbsLoading || isGuidesLoading,
    isError: isCrumbsError,
    error: crumbsError instanceof Error ? crumbsError : null,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedGuideId,
    setSelectedGuideId,
    quickFilter,
    setQuickFilter,
    filterState,
    guides,
  };
}
