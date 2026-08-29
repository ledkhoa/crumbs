import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import type { getDb } from '../../core/db/client';
import {
  Guides,
  GuideCrumbs,
  PostRestaurants,
  type Guide,
  type NewGuide,
} from '../../core/db/schemas';
import type {
  CreateGuideInput,
  UpdateGuideInput,
  GuideSummaryPayload,
  GuideDetailPayload,
  GuideCrumbItem,
} from './guides.types';

type DbInstance = ReturnType<typeof getDb>;

export class GuidesRepository {
  /**
   * Creates a new guide record in the database for the authenticated user.
   */
  static async create(
    db: DbInstance,
    userId: string,
    input: CreateGuideInput,
  ): Promise<Guide> {
    const newGuide: NewGuide = {
      userId,
      name: input.name,
      description: input.description,
      emojiIcon: input.emojiIcon || '🗺️',
      coverImageUrl: input.coverImageUrl,
      isPublic: input.isPublic ?? false,
    };

    const [created] = await db.insert(Guides).values(newGuide).returning();
    return created;
  }

  /**
   * Fetches high-level summary of all guides created by a user,
   * enriched with total crumbCount and preview cover thumbnails.
   */
  static async listUserGuides(
    db: DbInstance,
    userId: string,
  ): Promise<GuideSummaryPayload[]> {
    const userGuides = await db.query.Guides.findMany({
      where: eq(Guides.userId, userId),
      orderBy: [desc(Guides.updatedAt)],
      with: {
        guideCrumbs: {
          orderBy: [asc(GuideCrumbs.orderIndex)],
          with: {
            crumb: {
              with: {
                restaurant: true,
              },
            },
          },
        },
      },
    });

    return userGuides.map((guide) => {
      const crumbItems = guide.guideCrumbs || [];
      const crumbCount = crumbItems.length;

      // Extract up to 4 non-null restaurant photos for UI cover grid
      const coverThumbnails = crumbItems
        .map((gc) => gc.crumb?.restaurant?.photoUrl)
        .filter((url): url is string => Boolean(url))
        .slice(0, 4);

      return {
        id: guide.id,
        name: guide.name,
        description: guide.description,
        emojiIcon: guide.emojiIcon,
        coverImageUrl: guide.coverImageUrl,
        isPublic: guide.isPublic,
        crumbCount,
        coverThumbnails,
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt,
      };
    });
  }

  /**
   * Fetches a full detailed guide by ID, verifying access permissions
   * and resolving all ordered crumbs with 3-tier effective hero dishes and attribution.
   */
  static async getByIdWithCrumbs(
    db: DbInstance,
    guideId: string,
    requestingUserId?: string,
  ): Promise<GuideDetailPayload | null> {
    const guide = await db.query.Guides.findFirst({
      where: eq(Guides.id, guideId),
      with: {
        guideCrumbs: {
          orderBy: [asc(GuideCrumbs.orderIndex)],
          with: {
            crumb: {
              with: {
                restaurant: true,
                sourcePost: true,
              },
            },
          },
        },
      },
    });

    if (!guide) {
      return null;
    }

    // Access check: Only owner can view private guides
    if (
      !guide.isPublic &&
      (!requestingUserId || guide.userId !== requestingUserId)
    ) {
      return null;
    }

    const rawGuideCrumbs = guide.guideCrumbs || [];

    // Query PostRestaurants junction to resolve creator attribution and heroDish
    const restaurantIds = rawGuideCrumbs
      .map((gc) => gc.crumb?.restaurantId)
      .filter((id): id is string => Boolean(id));

    const postIds = rawGuideCrumbs
      .map((gc) => gc.crumb?.sourcePostId)
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

    const resolvedCrumbs: GuideCrumbItem[] = [];

    for (const gc of rawGuideCrumbs) {
      const crumb = gc.crumb;
      if (!crumb || !crumb.restaurant) continue;

      const pr =
        crumb.sourcePostId && crumb.restaurantId
          ? postRestMap.get(`${crumb.sourcePostId}_${crumb.restaurantId}`)
          : undefined;

      // 3-Tier Hero Dish Resolution Precedence:
      // Tier 3 (User Override) -> Tier 1 (Post Hero Dish) -> Tier 2 (Community Favorite Dish)
      const effectiveHeroDish =
        crumb.userHeroDishOverride ||
        pr?.heroDish ||
        crumb.restaurant.communityFavoriteDish ||
        null;

      const attribution = crumb.sourcePost
        ? {
            creatorUsername: crumb.sourcePost.authorUsername,
            vibeAnchor: pr?.vibeAnchor || null,
            courseCategory: pr?.courseCategory || null,
            walkInTips: pr?.walkInTips || null,
            vibeTags: pr?.vibeTags || [],
            sourcePostUrl: crumb.sourcePost.originalUrl,
          }
        : undefined;

      resolvedCrumbs.push({
        crumbId: crumb.id,
        orderIndex: gc.orderIndex,
        status: crumb.status,
        userNotes: crumb.userNotes ?? null,
        userHeroDishOverride: crumb.userHeroDishOverride ?? null,
        effectiveHeroDish,
        restaurant: crumb.restaurant,
        attribution,
      });
    }

    return {
      ...guide,
      crumbCount: resolvedCrumbs.length,
      crumbs: resolvedCrumbs,
    };
  }

  /**
   * Links a crumb to a guide.
   */
  static async addCrumb(
    db: DbInstance,
    guideId: string,
    crumbId: string,
    orderIndex = 0,
  ) {
    const [linked] = await db
      .insert(GuideCrumbs)
      .values({
        guideId,
        crumbId,
        orderIndex,
      })
      .onConflictDoNothing()
      .returning();
    return linked;
  }

  /**
   * Links multiple crumbs to a guide in a single batch.
   */
  static async addCrumbsBatch(
    db: DbInstance,
    guideId: string,
    crumbIds: string[],
  ) {
    if (crumbIds.length === 0) return [];

    const records = crumbIds.map((crumbId, index) => ({
      guideId,
      crumbId,
      orderIndex: index,
    }));

    return db
      .insert(GuideCrumbs)
      .values(records)
      .onConflictDoNothing()
      .returning();
  }

  /**
   * Updates an existing guide's metadata (name, description, emojiIcon, isPublic, coverImageUrl).
   */
  static async update(
    db: DbInstance,
    guideId: string,
    userId: string,
    data: UpdateGuideInput,
  ): Promise<Guide | null> {
    const updateValues: Partial<NewGuide> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.description !== undefined)
      updateValues.description = data.description;
    if (data.emojiIcon !== undefined) updateValues.emojiIcon = data.emojiIcon;
    if (data.coverImageUrl !== undefined)
      updateValues.coverImageUrl = data.coverImageUrl;
    if (data.isPublic !== undefined) updateValues.isPublic = data.isPublic;

    const [updated] = await db
      .update(Guides)
      .set(updateValues)
      .where(and(eq(Guides.id, guideId), eq(Guides.userId, userId)))
      .returning();

    return updated || null;
  }

  /**
   * Deletes a guide created by the authenticated user.
   */
  static async delete(
    db: DbInstance,
    guideId: string,
    userId: string,
  ): Promise<boolean> {
    const [deleted] = await db
      .delete(Guides)
      .where(and(eq(Guides.id, guideId), eq(Guides.userId, userId)))
      .returning();

    return Boolean(deleted);
  }

  /**
   * Removes a single crumb from a guide.
   */
  static async removeCrumb(
    db: DbInstance,
    guideId: string,
    crumbId: string,
    userId: string,
  ): Promise<boolean> {
    // Verify guide ownership
    const guide = await db.query.Guides.findFirst({
      where: and(eq(Guides.id, guideId), eq(Guides.userId, userId)),
    });

    if (!guide) return false;

    const [deleted] = await db
      .delete(GuideCrumbs)
      .where(
        and(eq(GuideCrumbs.guideId, guideId), eq(GuideCrumbs.crumbId, crumbId)),
      )
      .returning();

    return Boolean(deleted);
  }

  /**
   * Reorders crumbs in a guide by updating their orderIndex.
   */
  static async reorderCrumbs(
    db: DbInstance,
    guideId: string,
    crumbIds: string[],
    userId: string,
  ): Promise<boolean> {
    const guide = await db.query.Guides.findFirst({
      where: and(eq(Guides.id, guideId), eq(Guides.userId, userId)),
    });

    if (!guide) return false;

    for (let i = 0; i < crumbIds.length; i++) {
      await db
        .update(GuideCrumbs)
        .set({ orderIndex: i })
        .where(
          and(
            eq(GuideCrumbs.guideId, guideId),
            eq(GuideCrumbs.crumbId, crumbIds[i]),
          ),
        );
    }

    return true;
  }
}
