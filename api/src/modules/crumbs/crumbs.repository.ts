import { eq, and, desc, inArray } from 'drizzle-orm';
import type { getDb } from '../../core/db/client';
import { Crumbs, PostRestaurants } from '../../core/db/schemas';
import type {
  CrumbFilterOptions,
  EnrichedUserCrumb,
  ListCrumbsResponse,
  UpdateCrumbInput,
} from './crumbs.types';

type DbInstance = ReturnType<typeof getDb>;

export class CrumbsRepository {
  /**
   * Returns lightweight aggregate counts for all crumbs and uncategorized crumbs.
   */
  static async getUserCounts(
    db: DbInstance,
    userId: string,
  ): Promise<{ all: number; uncategorized: number }> {
    const rawCrumbs = await db.query.Crumbs.findMany({
      where: eq(Crumbs.userId, userId),
      columns: {
        id: true,
      },
      with: {
        guideCrumbs: {
          columns: {
            id: true,
          },
        },
      },
    });

    let uncategorized = 0;
    for (const c of rawCrumbs) {
      if (!c.guideCrumbs || c.guideCrumbs.length === 0) {
        uncategorized++;
      }
    }

    return {
      all: rawCrumbs.length,
      uncategorized,
    };
  }

  /**
   * Queries and returns enriched user crumbs with 3-tier hero dishes and filter aggregates.
   */
  static async listUserCrumbs(
    db: DbInstance,
    userId: string,
    options: CrumbFilterOptions = {},
  ): Promise<ListCrumbsResponse> {
    const rawCrumbs = await db.query.Crumbs.findMany({
      where: eq(Crumbs.userId, userId),
      orderBy: [desc(Crumbs.createdAt)],
      with: {
        restaurant: true,
        sourcePost: true,
        guideCrumbs: {
          with: {
            guide: true,
          },
        },
      },
    });

    // Resolve PostRestaurants junction for creator attribution & hero dish
    const restaurantIds = rawCrumbs
      .map((c) => c.restaurantId)
      .filter((id): id is string => Boolean(id));
    const postIds = rawCrumbs
      .map((c) => c.sourcePostId)
      .filter((id): id is string => Boolean(id));

    const postRestaurants =
      restaurantIds.length > 0 && postIds.length > 0
        ? await db.query.PostRestaurants.findMany({
            where: and(
              inArray(PostRestaurants.restaurantId, restaurantIds),
              inArray(PostRestaurants.postId, postIds),
            ),
          })
        : [];

    const postRestMap = new Map<string, (typeof postRestaurants)[0]>();
    for (const pr of postRestaurants) {
      postRestMap.set(`${pr.postId}_${pr.restaurantId}`, pr);
    }

    let unorganizedCount = 0;
    let bookableCount = 0;

    const enrichedList: EnrichedUserCrumb[] = [];

    for (const c of rawCrumbs) {
      if (!c.restaurant) continue;

      const guideItems = c.guideCrumbs || [];
      const guideIds = guideItems.map((gc) => gc.guideId);
      const isUnorganized = guideIds.length === 0;
      const isBookable = Boolean(
        c.restaurant.reservationUrl || c.restaurant.reservationProvider,
      );

      if (isUnorganized) unorganizedCount++;
      if (isBookable) bookableCount++;

      const pr =
        c.sourcePostId && c.restaurantId
          ? postRestMap.get(`${c.sourcePostId}_${c.restaurantId}`)
          : undefined;

      // 3-Tier Hero Dish Resolution Precedence:
      // Tier 3 (User Override) -> Tier 1 (Post Hero Dish) -> Tier 2 (Community Favorite Dish)
      const effectiveHeroDish =
        c.userHeroDishOverride ||
        pr?.heroDish ||
        c.restaurant.communityFavoriteDish ||
        null;

      const postAttribution = c.sourcePost
        ? {
            heroDish: pr?.heroDish ?? null,
            vibeAnchor: pr?.vibeAnchor ?? null,
            courseCategory: pr?.courseCategory ?? null,
            walkInTips: pr?.walkInTips ?? null,
            vibeTags: pr?.vibeTags ?? [],
            recommendedDishes: pr?.recommendedDishes ?? [],
            creatorNotes: pr?.creatorNotes ?? null,
          }
        : null;

      const guides = guideItems
        .filter((gc) => Boolean(gc.guide))
        .map((gc) => ({
          id: gc.guide.id,
          name: gc.guide.name,
          emojiIcon: gc.guide.emojiIcon || '🗺️',
        }));

      enrichedList.push({
        id: c.id,
        userId: c.userId,
        restaurantId: c.restaurantId,
        sourcePostId: c.sourcePostId,
        status: c.status,
        userNotes: c.userNotes ?? null,
        userHeroDishOverride: c.userHeroDishOverride ?? null,
        effectiveHeroDish,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        restaurant: {
          id: c.restaurant.id,
          googlePlaceId: c.restaurant.googlePlaceId ?? null,
          name: c.restaurant.name,
          formattedAddress: c.restaurant.formattedAddress ?? null,
          city: c.restaurant.city ?? null,
          state: c.restaurant.state ?? null,
          country: c.restaurant.country ?? null,
          latitude: c.restaurant.latitude
            ? Number(c.restaurant.latitude)
            : null,
          longitude: c.restaurant.longitude
            ? Number(c.restaurant.longitude)
            : null,
          cuisine: c.restaurant.cuisine ?? null,
          rating: c.restaurant.rating ? Number(c.restaurant.rating) : null,
          userRatingCount: c.restaurant.userRatingCount ?? null,
          priceLevel: c.restaurant.priceLevel ?? null,
          mapsUrl: c.restaurant.mapsUrl ?? null,
          websiteUrl: c.restaurant.websiteUrl ?? null,
          photoUrl: c.restaurant.photoUrl ?? null,
          editorialSummary: c.restaurant.editorialSummary ?? null,
          communityFavoriteDish: c.restaurant.communityFavoriteDish ?? null,
          reservationUrl: c.restaurant.reservationUrl ?? null,
          reservationProvider: c.restaurant.reservationProvider ?? null,
        },
        sourcePost: c.sourcePost
          ? {
              id: c.sourcePost.id,
              platform: c.sourcePost.platform,
              postType: c.sourcePost.postType,
              platformPostId: c.sourcePost.platformPostId ?? null,
              authorUsername: c.sourcePost.authorUsername ?? null,
              originalUrl: c.sourcePost.originalUrl,
              caption: c.sourcePost.caption ?? null,
              locationName: c.sourcePost.locationName ?? null,
              mediaUrls: c.sourcePost.mediaUrls ?? [],
              classification: c.sourcePost.classification ?? null,
              summary: c.sourcePost.summary ?? null,
            }
          : null,
        postAttribution,
        guideIds,
        guides,
      });
    }

    // Apply Client Filter Predicates
    let filtered = enrichedList;

    if (options.status) {
      filtered = filtered.filter((c) => c.status === options.status);
    }

    if (options.unorganized === true) {
      filtered = filtered.filter((c) => c.guideIds.length === 0);
    }

    if (options.bookable === true) {
      filtered = filtered.filter(
        (c) =>
          Boolean(c.restaurant.reservationUrl) ||
          Boolean(c.restaurant.reservationProvider),
      );
    }

    if (options.guideId) {
      filtered = filtered.filter((c) => c.guideIds.includes(options.guideId!));
    }

    if (options.neighborhood) {
      const targetN = options.neighborhood.toLowerCase();
      filtered = filtered.filter((c) =>
        c.restaurant.formattedAddress?.toLowerCase().includes(targetN),
      );
    }

    return {
      success: true,
      crumbs: filtered,
      total: enrichedList.length,
      unorganizedCount,
      bookableCount,
    };
  }

  /**
   * Updates an existing crumb record belonging to the authenticated user.
   */
  static async update(
    db: DbInstance,
    crumbId: string,
    userId: string,
    input: UpdateCrumbInput,
  ): Promise<EnrichedUserCrumb | null> {
    const existing = await db.query.Crumbs.findFirst({
      where: and(eq(Crumbs.id, crumbId), eq(Crumbs.userId, userId)),
    });

    if (!existing) {
      return null;
    }

    await db
      .update(Crumbs)
      .set({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.userNotes !== undefined && { userNotes: input.userNotes }),
        ...(input.userHeroDishOverride !== undefined && {
          userHeroDishOverride: input.userHeroDishOverride,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(Crumbs.id, crumbId), eq(Crumbs.userId, userId)));

    const listResult = await this.listUserCrumbs(db, userId);
    return listResult.crumbs.find((c) => c.id === crumbId) || null;
  }

  /**
   * Deletes a crumb record belonging to the authenticated user.
   */
  static async delete(
    db: DbInstance,
    crumbId: string,
    userId: string,
  ): Promise<boolean> {
    const deleted = await db
      .delete(Crumbs)
      .where(and(eq(Crumbs.id, crumbId), eq(Crumbs.userId, userId)))
      .returning();

    return deleted.length > 0;
  }
}
