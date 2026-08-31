import { describe, expect, it } from 'bun:test';

interface CrumbRecord {
  id: string;
  userId: string;
  restaurantId: string;
}

interface RestaurantRecord {
  id: string;
  name: string;
}

interface GuideCrumbRecord {
  guideId: string;
  crumbId: string;
  orderIndex: number;
}

export interface SimulateAddCrumbsBatchResult {
  createdUserCrumbs: CrumbRecord[];
  addedGuideCrumbs: GuideCrumbRecord[];
}

export interface SimulateAddCrumbsBatchParams {
  guideId: string;
  targetIds: string[];
  userId?: string;
  existingUserCrumbs: CrumbRecord[];
  existingRestaurants: RestaurantRecord[];
  existingGuideCrumbs: GuideCrumbRecord[];
}

/**
 * Pure simulator of GuidesRepository.addCrumbsBatch ID resolution and sequential ordering.
 */
export function simulateAddCrumbsBatch(
  params: SimulateAddCrumbsBatchParams,
): SimulateAddCrumbsBatchResult {
  const {
    guideId,
    targetIds,
    userId,
    existingUserCrumbs,
    existingRestaurants,
    existingGuideCrumbs,
  } = params;

  if (targetIds.length === 0) {
    return { createdUserCrumbs: [], addedGuideCrumbs: [] };
  }

  const createdUserCrumbs: CrumbRecord[] = [];
  let finalCrumbIds: string[] = [];

  if (userId) {
    const matchedCrumbIdSet = new Set(
      existingUserCrumbs.filter((c) => c.userId === userId).map((c) => c.id),
    );
    const matchedRestIdMap = new Map(
      existingUserCrumbs
        .filter((c) => c.userId === userId)
        .map((c) => [c.restaurantId, c.id]),
    );

    for (const id of targetIds) {
      if (matchedCrumbIdSet.has(id)) {
        finalCrumbIds.push(id);
      } else if (matchedRestIdMap.has(id)) {
        finalCrumbIds.push(matchedRestIdMap.get(id)!);
      } else {
        const rest = existingRestaurants.find((r) => r.id === id);
        if (rest) {
          const newCrumb: CrumbRecord = {
            id: `crumb_auto_${rest.id}`,
            userId,
            restaurantId: rest.id,
          };
          createdUserCrumbs.push(newCrumb);
          finalCrumbIds.push(newCrumb.id);
          matchedRestIdMap.set(rest.id, newCrumb.id);
        } else {
          finalCrumbIds.push(id);
        }
      }
    }
  } else {
    finalCrumbIds = targetIds;
  }

  finalCrumbIds = Array.from(new Set(finalCrumbIds));

  const guideEntries = existingGuideCrumbs.filter(
    (gc) => gc.guideId === guideId,
  );
  const currentMaxIndex =
    guideEntries.length > 0
      ? Math.max(...guideEntries.map((gc) => gc.orderIndex)) + 1
      : 0;

  const addedGuideCrumbs = finalCrumbIds.map((crumbId, index) => ({
    guideId,
    crumbId,
    orderIndex: currentMaxIndex + index,
  }));

  return { createdUserCrumbs, addedGuideCrumbs };
}

describe('Guides Business Logic & Ingestion Integration', () => {
  it('should resolve direct crumb IDs and link to guide sequentially', () => {
    const result = simulateAddCrumbsBatch({
      guideId: 'guide-1',
      targetIds: ['crumb-1', 'crumb-2'],
      userId: 'user-1',
      existingUserCrumbs: [
        { id: 'crumb-1', userId: 'user-1', restaurantId: 'rest-1' },
        { id: 'crumb-2', userId: 'user-1', restaurantId: 'rest-2' },
      ],
      existingRestaurants: [],
      existingGuideCrumbs: [],
    });

    expect(result.addedGuideCrumbs).toHaveLength(2);
    expect(result.addedGuideCrumbs[0]?.crumbId).toBe('crumb-1');
    expect(result.addedGuideCrumbs[0]?.orderIndex).toBe(0);
    expect(result.addedGuideCrumbs[1]?.crumbId).toBe('crumb-2');
    expect(result.addedGuideCrumbs[1]?.orderIndex).toBe(1);
    expect(result.createdUserCrumbs).toHaveLength(0);
  });

  it('should resolve restaurant IDs to existing user crumb IDs', () => {
    const result = simulateAddCrumbsBatch({
      guideId: 'guide-1',
      targetIds: ['rest-1'],
      userId: 'user-1',
      existingUserCrumbs: [
        { id: 'crumb-abc', userId: 'user-1', restaurantId: 'rest-1' },
      ],
      existingRestaurants: [{ id: 'rest-1', name: 'Via Carota' }],
      existingGuideCrumbs: [],
    });

    expect(result.addedGuideCrumbs).toHaveLength(1);
    expect(result.addedGuideCrumbs[0]?.crumbId).toBe('crumb-abc');
    expect(result.createdUserCrumbs).toHaveLength(0);
  });

  it('should auto-create user crumb if restaurant ID has not been saved yet', () => {
    const result = simulateAddCrumbsBatch({
      guideId: 'guide-1',
      targetIds: ['rest-new'],
      userId: 'user-1',
      existingUserCrumbs: [],
      existingRestaurants: [{ id: 'rest-new', name: 'Lilia' }],
      existingGuideCrumbs: [],
    });

    expect(result.createdUserCrumbs).toHaveLength(1);
    expect(result.createdUserCrumbs[0]?.restaurantId).toBe('rest-new');
    expect(result.addedGuideCrumbs[0]?.crumbId).toBe('crumb_auto_rest-new');
  });

  it('should append newly added crumbs after existing guide crumbs with incremented orderIndex', () => {
    const result = simulateAddCrumbsBatch({
      guideId: 'guide-1',
      targetIds: ['crumb-3'],
      userId: 'user-1',
      existingUserCrumbs: [
        { id: 'crumb-3', userId: 'user-1', restaurantId: 'rest-3' },
      ],
      existingRestaurants: [],
      existingGuideCrumbs: [
        { guideId: 'guide-1', crumbId: 'crumb-1', orderIndex: 0 },
        { guideId: 'guide-1', crumbId: 'crumb-2', orderIndex: 1 },
      ],
    });

    expect(result.addedGuideCrumbs).toHaveLength(1);
    expect(result.addedGuideCrumbs[0]?.crumbId).toBe('crumb-3');
    expect(result.addedGuideCrumbs[0]?.orderIndex).toBe(2);
  });

  it('should deduplicate multiple identical IDs in the same batch', () => {
    const result = simulateAddCrumbsBatch({
      guideId: 'guide-1',
      targetIds: ['crumb-1', 'crumb-1'],
      userId: 'user-1',
      existingUserCrumbs: [
        { id: 'crumb-1', userId: 'user-1', restaurantId: 'rest-1' },
      ],
      existingRestaurants: [],
      existingGuideCrumbs: [],
    });

    expect(result.addedGuideCrumbs).toHaveLength(1);
    expect(result.addedGuideCrumbs[0]?.crumbId).toBe('crumb-1');
  });
});
