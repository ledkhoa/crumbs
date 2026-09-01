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

export interface UpdateGuideInput {
  name?: string;
  description?: string | null;
  emojiIcon?: string;
  coverImageUrl?: string | null;
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

/**
 * Hook to update guide metadata (name, description, emojiIcon, isPublic).
 */
export function useUpdateGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guideId,
      input,
    }: {
      guideId: string;
      input: UpdateGuideInput;
    }) => {
      const res = await apiClient.guides[':id'].$patch({
        param: { id: guideId },
        json: input,
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.guides.detail(variables.guideId),
      });
    },
    onError: () => {
      haptics.error();
    },
  });
}

/**
 * Hook to delete a guide created by the authenticated user.
 */
export function useDeleteGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guideId: string) => {
      const res = await apiClient.guides[':id'].$delete({
        param: { id: guideId },
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
    },
    onError: () => {
      haptics.error();
    },
  });
}

export interface AddCrumbsToGuideInput {
  guideId: string;
  crumbId?: string;
  crumbIds?: string[];
}

/**
 * Hook to link one or more crumbs to a guide with cache invalidation and haptics.
 */
export function useAddCrumbToGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guideId,
      crumbId,
      crumbIds,
    }: AddCrumbsToGuideInput) => {
      const res = await apiClient.guides[':id'].crumbs.$post({
        param: { id: guideId },
        json: {
          crumbId,
          crumbIds,
        },
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.guides.detail(variables.guideId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.allList() });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.crumbs.uncategorized(),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.counts() });
    },
    onError: () => {
      haptics.error();
    },
  });
}

/**
 * Hook to remove a single crumb from a guide.
 */
export function useRemoveCrumbFromGuideMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guideId,
      crumbId,
    }: {
      guideId: string;
      crumbId: string;
    }) => {
      const res = await apiClient.guides[':id'].crumbs[':crumbId'].$delete({
        param: { id: guideId, crumbId },
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      haptics.tap();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.guides.detail(variables.guideId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.allList() });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.crumbs.uncategorized(),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.counts() });
    },
    onError: () => {
      haptics.error();
    },
  });
}

/**
 * Hook to reorder crumbs within a guide.
 */
export function useReorderGuideCrumbsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guideId,
      crumbIds,
    }: {
      guideId: string;
      crumbIds: string[];
    }) => {
      const res = await apiClient.guides[':id'].reorder.$put({
        param: { id: guideId },
        json: { crumbIds },
      });

      if (!res.ok) {
        // SAFETY: Server error response contains error message
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      haptics.success();
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.guides.detail(variables.guideId),
      });
    },
    onError: () => {
      haptics.error();
    },
  });
}
