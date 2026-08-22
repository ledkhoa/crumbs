import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/api-client';
import { QUERY_KEYS } from '@/utils/query-keys';
import { haptics } from '@/utils/haptics';
import type {
  IngestionStep,
  IngestionStepId,
  UnifiedIngestionResult,
  UnifiedRestaurantSpot,
  ProcessedCrumbPayload,
  CachedRestaurantSummary,
} from '@/types/ingest';

export type IngestionPhase =
  | 'idle'
  | 'starting'
  | 'in_progress'
  | 'fast_path_resolved'
  | 'completed'
  | 'unrelated'
  | 'error';

export interface UseIngestionOptions {
  guideId?: string;
  onSuccess?: (result: UnifiedIngestionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseIngestionReturn {
  phase: IngestionPhase;
  steps: IngestionStep[];
  activeStepIndex: number;
  result: UnifiedIngestionResult | null;
  error: Error | null;
  isPolling: boolean;
  startIngestion: (url: string) => Promise<void>;
  cancelIngestion: () => void;
  retry: () => void;
}

const INITIAL_STEPS: IngestionStep[] = [
  {
    id: 'capturing',
    label: 'Capturing Crumb... 🍞',
    sublabel: 'Extracting creator post & media',
    status: 'pending',
  },
  {
    id: 'analyzing',
    label: 'Analyzing video & caption ✨',
    sublabel: 'AI detecting food, vibes & hero dish',
    status: 'pending',
  },
  {
    id: 'matching',
    label: 'Matching Google Place & Hero Dish 📍',
    sublabel: 'Resolving coordinates, hours & ratings',
    status: 'pending',
  },
  {
    id: 'saved',
    label: 'Saved to Inbox! 🌿',
    sublabel: 'Ready for guides & craving search',
    status: 'pending',
  },
];

const POLLING_INTERVAL_MS = 1200;
const MAX_POLLING_DURATION_MS = 45000;

export function useIngestion(
  options: UseIngestionOptions = {},
): UseIngestionReturn {
  const { onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<IngestionPhase>('idle');
  const [steps, setSteps] = useState<IngestionStep[]>(INITIAL_STEPS);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [result, setResult] = useState<UnifiedIngestionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const lastUrlRef = useRef<string>('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  const clearAllTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const updateStepStatus = useCallback(
    (stepId: IngestionStepId, status: IngestionStep['status']) => {
      setSteps((prev) =>
        prev.map((step) => (step.id === stepId ? { ...step, status } : step)),
      );
    },
    [],
  );

  const setStepActive = useCallback((index: number) => {
    setActiveStepIndex(index);
    setSteps((prev) =>
      prev.map((step, idx) => {
        if (idx < index) return { ...step, status: 'completed' };
        if (idx === index) return { ...step, status: 'active' };
        return { ...step, status: 'pending' };
      }),
    );
  }, []);

  const cancelIngestion = useCallback(() => {
    cancelledRef.current = true;
    clearAllTimers();
    setIsPolling(false);
    setPhase('idle');
  }, [clearAllTimers]);

  const handleFinishSuccess = useCallback(
    (finalResult: UnifiedIngestionResult) => {
      clearAllTimers();
      setIsPolling(false);
      setResult(finalResult);

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.inbox() });

      if (
        finalResult.classification !== 'restaurant_related' ||
        finalResult.spots.length === 0
      ) {
        setPhase('unrelated');
      } else {
        setPhase('completed');
      }

      onSuccess?.(finalResult);
    },
    [clearAllTimers, onSuccess, queryClient],
  );

  const pollWorkflowStatus = useCallback(
    async (workflowId: string, sourceUrl: string) => {
      if (cancelledRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > MAX_POLLING_DURATION_MS) {
        clearAllTimers();
        setIsPolling(false);
        const timeoutErr = new Error(
          'Processing took longer than expected. Please try again or search manually.',
        );
        setError(timeoutErr);
        setPhase('error');
        haptics.error();
        onError?.(timeoutErr);
        return;
      }

      try {
        const res = await apiClient.ingest[':instanceId'].$get({
          param: { instanceId: workflowId },
        });

        if (cancelledRef.current) return;

        if (!res.ok) {
          throw new Error(`Polling status check failed: HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.status === 'complete' && data.output) {
          clearAllTimers();
          // SAFETY: Server contract guarantees status 'complete' provides finalized ProcessedCrumbPayload output
          const output = data.output as ProcessedCrumbPayload;

          const spots: UnifiedRestaurantSpot[] = (output.restaurants || []).map(
            (r) => ({
              id: r.id,
              name: r.name,
              googlePlaceId: r.placeDetails?.placeId,
              formattedAddress:
                r.placeDetails?.formattedAddress || r.address || '',
              neighborhood:
                r.placeDetails?.neighborhood || r.city || r.state || '',
              rating: r.placeDetails?.rating,
              userRatingCount: r.placeDetails?.userRatingCount,
              priceLevel: r.placeDetails?.priceLevel,
              photoUrl: r.placeDetails?.photoUrl,
              mapsUrl: r.placeDetails?.mapsUrl,
              websiteUrl: r.placeDetails?.websiteUrl,
              reservationUrl:
                r.reservationUrl || r.placeDetails?.reservationUrl,
              reservationProvider:
                r.reservationProvider || r.placeDetails?.reservationProvider,
              heroDish: r.heroDish || r.placeDetails?.communityFavoriteDish,
              vibeAnchor: r.vibeAnchor,
              courseCategory: r.courseCategory,
              walkInTips: r.walkInTips,
              vibeTags: r.vibeTags || [],
              recommendedDishes: r.recommendedDishes || [],
              editorialSummary: r.placeDetails?.editorialSummary,
            }),
          );

          const unifiedResult: UnifiedIngestionResult = {
            sourceUrl: output.url || sourceUrl,
            authorUsername: output.authorUsername,
            caption: output.caption,
            classification: output.classification,
            summary: output.summary,
            isCachedHit: false,
            spots,
          };

          // Finish step 3 and advance step 4
          updateStepStatus('matching', 'completed');
          haptics.selection();
          updateStepStatus('saved', 'completed');
          setActiveStepIndex(3);
          haptics.success();

          setTimeout(() => {
            if (!cancelledRef.current) {
              handleFinishSuccess(unifiedResult);
            }
          }, 400);
        } else if (data.status === 'errored' || data.status === 'terminated') {
          clearAllTimers();
          setIsPolling(false);
          const workflowErr = new Error(
            data.error
              ? String(data.error)
              : 'Failed to process post. Please try again.',
          );
          setError(workflowErr);
          setPhase('error');
          haptics.error();
          onError?.(workflowErr);
        }
      } catch (err: unknown) {
        // Tolerant network polling retry
        console.warn('[useIngestion polling error]:', err);
      }
    },
    [clearAllTimers, handleFinishSuccess, onError, updateStepStatus],
  );

  const startIngestion = useCallback(
    async (url: string) => {
      if (!url) return;

      cancelledRef.current = false;
      lastUrlRef.current = url;
      setError(null);
      setResult(null);
      setPhase('starting');
      setSteps(INITIAL_STEPS);
      setActiveStepIndex(0);
      startTimeRef.current = Date.now();

      clearAllTimers();

      try {
        const res = await apiClient.ingest.$post({
          json: {
            url,
          },
        });

        if (cancelledRef.current) return;

        if (!res.ok) {
          // SAFETY: Server error response returns a JSON object with error field
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errData.error || `Failed to submit post (HTTP ${res.status})`,
          );
        }

        const data = await res.json();

        // 1. FAST-PATH CACHE HIT (<150ms Instant Resolution)
        if (data.cached) {
          setPhase('fast_path_resolved');
          const postData = data.post;
          // SAFETY: Fast-Path cache hit response returns structured CachedRestaurantSummary objects
          const restaurantsData = (data.restaurants ||
            []) as CachedRestaurantSummary[];

          const spots: UnifiedRestaurantSpot[] = restaurantsData.map((r) => ({
            id: r.id,
            crumbId: r.crumbId,
            name: r.name,
            formattedAddress: r.formattedAddress || '',
            neighborhood: r.neighborhood || r.city || r.state || '',
            city: r.city,
            state: r.state,
            country: r.country,
            rating: r.rating ? Number(r.rating) : null,
            priceLevel: r.priceLevel,
            photoUrl: r.photoUrl,
            mapsUrl: r.mapsUrl,
            websiteUrl: r.websiteUrl,
            reservationUrl: r.reservationUrl,
            reservationProvider: r.reservationProvider,
            heroDish: r.heroDish || null,
            vibeAnchor: r.vibeAnchor || null,
            walkInTips: r.walkInTips || null,
            vibeTags: r.vibeTags || [],
            recommendedDishes: [],
          }));

          const rawClassification = postData?.classification;
          const classification: ProcessedCrumbPayload['classification'] =
            rawClassification === 'travel_unrelated_to_restaurants' ||
            rawClassification === 'random_unrelated'
              ? rawClassification
              : 'restaurant_related';

          const unifiedResult: UnifiedIngestionResult = {
            sourceUrl: postData?.originalUrl || url,
            authorUsername: postData?.authorUsername,
            caption: postData?.caption,
            classification,
            summary: postData?.summary || '',
            isCachedHit: true,
            spots,
          };

          // Instant fast-path checkmarks
          setSteps((prev) =>
            prev.map((step) => ({ ...step, status: 'completed' })),
          );
          setActiveStepIndex(3);
          haptics.success();

          clearAllTimers();
          setIsPolling(false);
          handleFinishSuccess(unifiedResult);
          return;
        }

        // 2. NORMAL ASYNC WORKFLOW QUEUED
        setPhase('in_progress');
        setIsPolling(true);
        setStepActive(0); // Step 1: Capturing

        // Schedule Step 2 (Analyzing) at T+1400ms
        stepTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current) {
            setStepActive(1);
            haptics.selection();

            // Schedule Step 3 (Matching) at T+3200ms
            stepTimerRef.current = setTimeout(() => {
              if (!cancelledRef.current) {
                setStepActive(2);
                haptics.selection();
              }
            }, 1800);
          }
        }, 1400);

        // Start periodic polling for Cloudflare Workflow completion
        const workflowId = data.workflowId;
        pollTimerRef.current = setInterval(() => {
          pollWorkflowStatus(workflowId, url);
        }, POLLING_INTERVAL_MS);

        // Trigger immediate first poll check
        pollWorkflowStatus(workflowId, url);
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        clearAllTimers();
        setIsPolling(false);
        const errorObj =
          err instanceof Error
            ? err
            : new Error('Failed to start ingestion process');
        setError(errorObj);
        setPhase('error');
        haptics.error();
        onError?.(errorObj);
      }
    },
    [
      clearAllTimers,
      handleFinishSuccess,
      onError,
      pollWorkflowStatus,
      setStepActive,
    ],
  );

  const retry = useCallback(() => {
    if (lastUrlRef.current) {
      startIngestion(lastUrlRef.current);
    }
  }, [startIngestion]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    phase,
    steps,
    activeStepIndex,
    result,
    error,
    isPolling,
    startIngestion,
    cancelIngestion,
    retry,
  };
}
