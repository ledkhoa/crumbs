import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/api-client';
import { QUERY_KEYS } from '@/utils/query-keys';
import { haptics } from '@/utils/haptics';

export interface CreateGuideInput {
  name: string;
  description?: string;
  emojiIcon?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
}

/**
 * Hook to fetch all guides created by the authenticated user.
 */
export function useGuidesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.guides.lists(),
    queryFn: async () => {
      const res = await apiClient.guides.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch guides: HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.guides;
    },
  });
}

/**
 * Hook to fetch a single guide's detailed itinerary and resolved crumbs.
 */
export function useGuideDetailQuery(guideId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.guides.detail(guideId),
    queryFn: async () => {
      const res = await apiClient.guides[':id'].$get({
        param: { id: guideId },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch guide detail: HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.guide;
    },
    enabled: Boolean(guideId),
  });
}

/**
 * Hook to create a new guide with automatic cache invalidation and haptics.
 */
export function useCreateGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CreateGuideInput) => {
      const res = await apiClient.guides.$post({
        json,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
    },
    onError: () => {
      haptics.error();
    },
  });
}
