import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '@/utils/storage';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

export interface BackgroundIngestJob {
  workflowId: string;
  sourceUrl: string;
  startedAt: number;
  status: 'queued' | 'running' | 'complete' | 'error';
  spotCount?: number;
}

export interface InAppToastPayload {
  id: string;
  restaurant: UnifiedRestaurantSpot;
  sourceUrl: string;
  createdAt: number;
}

interface InboxState {
  lastInboxViewedAt: number;
  activeBackgroundJobs: Record<string, BackgroundIngestJob>;
  activeToast: InAppToastPayload | null;

  // Actions
  markInboxAsViewed: () => void;
  addBackgroundJob: (job: { workflowId: string; sourceUrl: string }) => void;
  updateBackgroundJob: (
    workflowId: string,
    patch: Partial<BackgroundIngestJob>,
  ) => void;
  removeBackgroundJob: (workflowId: string) => void;
  showToast: (payload: InAppToastPayload) => void;
  hideToast: () => void;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set) => ({
      lastInboxViewedAt: 0,
      activeBackgroundJobs: {},
      activeToast: null,

      markInboxAsViewed: () =>
        set({
          lastInboxViewedAt: Date.now(),
        }),

      addBackgroundJob: ({ workflowId, sourceUrl }) =>
        set((state) => ({
          activeBackgroundJobs: {
            ...state.activeBackgroundJobs,
            [workflowId]: {
              workflowId,
              sourceUrl,
              startedAt: Date.now(),
              status: 'running',
            },
          },
        })),

      updateBackgroundJob: (workflowId, patch) =>
        set((state) => {
          const existing = state.activeBackgroundJobs[workflowId];
          if (!existing) return state;
          return {
            activeBackgroundJobs: {
              ...state.activeBackgroundJobs,
              [workflowId]: { ...existing, ...patch },
            },
          };
        }),

      removeBackgroundJob: (workflowId) =>
        set((state) => {
          const next = { ...state.activeBackgroundJobs };
          delete next[workflowId];
          return { activeBackgroundJobs: next };
        }),

      showToast: (payload) =>
        set({
          activeToast: payload,
        }),

      hideToast: () =>
        set({
          activeToast: null,
        }),
    }),
    {
      name: 'crumbs-inbox-storage',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        lastInboxViewedAt: state.lastInboxViewedAt,
        activeBackgroundJobs: state.activeBackgroundJobs,
      }),
    },
  ),
);
