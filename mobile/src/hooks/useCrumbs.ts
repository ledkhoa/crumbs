import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/api-client';
import { QUERY_KEYS } from '@/utils/query-keys';
import { haptics } from '@/utils/haptics';
import { useInboxStore } from '@/store/inbox';
import type {
  EnrichedUserCrumb,
  UpdateCrumbInput,
} from '@api/modules/crumbs/crumbs.types';

export interface UseCrumbsFilterOptions {
  status?: 'inbox' | 'saved' | 'visited';
  search?: string;
  guideId?: string;
  unorganized?: boolean;
  bookable?: boolean;
  neighborhood?: string;
  enabled?: boolean;
}

/**
 * Hook to query lightweight aggregate counts for unorganized and all crumbs.
 */
export function useCrumbsCountsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.crumbs.counts(),
    queryFn: async () => {
      const res = await apiClient.crumbs.counts.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch crumb counts: HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

/**
 * Hook to query enriched crumbs with filtering and search capabilities.
 */
export function useCrumbsQuery(filters: UseCrumbsFilterOptions = {}) {
  const { enabled, ...queryFilters } = filters;

  const queryKey =
    queryFilters.unorganized === true
      ? QUERY_KEYS.crumbs.uncategorized(queryFilters.search)
      : queryFilters.unorganized === false ||
          (queryFilters.unorganized === undefined && !queryFilters.guideId)
        ? QUERY_KEYS.crumbs.allList(queryFilters.search)
        : QUERY_KEYS.crumbs.list(queryFilters);

  return useQuery({
    queryKey,
    enabled: enabled !== undefined ? enabled : true,
    queryFn: async () => {
      const res = await apiClient.crumbs.$get({
        query: {
          ...(queryFilters.status && { status: queryFilters.status }),
          ...(queryFilters.search && { search: queryFilters.search }),
          ...(queryFilters.guideId && { guideId: queryFilters.guideId }),
          ...(queryFilters.unorganized !== undefined && {
            unorganized: String(queryFilters.unorganized),
          }),
          ...(queryFilters.bookable !== undefined && {
            bookable: String(queryFilters.bookable),
          }),
          ...(queryFilters.neighborhood && {
            neighborhood: queryFilters.neighborhood,
          }),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch crumbs: HTTP ${res.status}`);
      }

      const data = await res.json();
      return data;
    },
  });
}

/**
 * Hook to update crumb status, notes, or hero dish override.
 */
export function useUpdateCrumbMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      crumbId,
      input,
    }: {
      crumbId: string;
      input: UpdateCrumbInput;
    }) => {
      const res = await apiClient.crumbs[':id'].$patch({
        param: { id: crumbId },
        json: input,
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
    },
    onError: () => {
      haptics.error();
    },
  });
}

/**
 * Hook to delete a crumb record with cache invalidation and haptics.
 */
export function useDeleteCrumbMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (crumbId: string) => {
      const res = await apiClient.crumbs[':id'].$delete({
        param: { id: crumbId },
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      haptics.heavy();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
    },
    onError: () => {
      haptics.error();
    },
  });
}

/**
 * Hook to compute the real-time unread counter for the Inbox tab badge.
 */
export function useUnreadCrumbsCount(): number {
  const lastViewedAt = useInboxStore((s) => s.lastInboxViewedAt);
  const { data } = useCrumbsQuery({ unorganized: true });

  if (!data || !data.crumbs) return 0;

  // SAFETY: apiClient.crumbs.$get returns EnrichedUserCrumb array in crumbs field
  return (data.crumbs as EnrichedUserCrumb[]).filter(
    (c) => new Date(c.createdAt).getTime() > lastViewedAt,
  ).length;
}
