import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/api-client';
import { QUERY_KEYS } from '@/utils/query-keys';
import { haptics } from '@/utils/haptics';
import { useInboxStore } from '@/store/inbox';
import type {
  ProcessedCrumbPayload,
  UnifiedRestaurantSpot,
} from '@/types/ingest';

const POLLING_INTERVAL_MS = 1500;
const MAX_JOB_AGE_MS = 60000;

export function BackgroundIngestionPoller() {
  const queryClient = useQueryClient();
  const activeJobs = useInboxStore((state) => state.activeBackgroundJobs);
  const removeBackgroundJob = useInboxStore(
    (state) => state.removeBackgroundJob,
  );
  const showToast = useInboxStore((state) => state.showToast);

  const activeJobsRef = useRef(activeJobs);
  activeJobsRef.current = activeJobs;

  useEffect(() => {
    const jobKeys = Object.keys(activeJobs);
    if (jobKeys.length === 0) return;

    const intervalId = setInterval(async () => {
      const currentJobs = activeJobsRef.current;
      const keys = Object.keys(currentJobs);

      for (const workflowId of keys) {
        const job = currentJobs[workflowId];
        if (!job) continue;

        // Clean up stale jobs older than MAX_JOB_AGE_MS
        if (Date.now() - job.startedAt > MAX_JOB_AGE_MS) {
          removeBackgroundJob(workflowId);
          continue;
        }

        try {
          const res = await apiClient.ingest[':instanceId'].$get({
            param: { instanceId: workflowId },
          });

          if (!res.ok) continue;

          const data = await res.json();

          if (data.status === 'complete' && data.output) {
            // SAFETY: Server contract guarantees status 'complete' returns ProcessedCrumbPayload
            const output = data.output as ProcessedCrumbPayload;
            removeBackgroundJob(workflowId);

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.crumbs.all });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guides.all });

            const firstRest = output.restaurants?.[0];
            if (firstRest) {
              const spot: UnifiedRestaurantSpot = {
                id: firstRest.id,
                crumbId: firstRest.crumbId,
                name: firstRest.name,
                googlePlaceId: firstRest.placeDetails?.placeId,
                formattedAddress:
                  firstRest.placeDetails?.formattedAddress ||
                  firstRest.address ||
                  '',
                neighborhood:
                  firstRest.placeDetails?.neighborhood ||
                  firstRest.city ||
                  firstRest.state ||
                  '',
                rating: firstRest.placeDetails?.rating,
                userRatingCount: firstRest.placeDetails?.userRatingCount,
                priceLevel: firstRest.placeDetails?.priceLevel,
                photoUrl: firstRest.placeDetails?.photoUrl,
                mapsUrl: firstRest.placeDetails?.mapsUrl,
                websiteUrl: firstRest.placeDetails?.websiteUrl,
                reservationUrl:
                  firstRest.reservationUrl ||
                  firstRest.placeDetails?.reservationUrl,
                reservationProvider:
                  firstRest.reservationProvider ||
                  firstRest.placeDetails?.reservationProvider,
                heroDish:
                  firstRest.heroDish ||
                  firstRest.placeDetails?.communityFavoriteDish,
                vibeAnchor: firstRest.vibeAnchor,
                courseCategory: firstRest.courseCategory,
                walkInTips: firstRest.walkInTips,
                vibeTags: firstRest.vibeTags || [],
                recommendedDishes: firstRest.recommendedDishes || [],
                editorialSummary: firstRest.placeDetails?.editorialSummary,
              };

              haptics.success();
              showToast({
                id: workflowId,
                restaurant: spot,
                sourceUrl: job.sourceUrl,
                createdAt: Date.now(),
              });
            }
          } else if (
            data.status === 'errored' ||
            data.status === 'terminated'
          ) {
            removeBackgroundJob(workflowId);
          }
        } catch (err) {
          console.warn('[BackgroundIngestionPoller error]:', err);
        }
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [activeJobs, queryClient, removeBackgroundJob, showToast]);

  return null;
}
