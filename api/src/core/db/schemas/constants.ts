import { timestamp } from 'drizzle-orm/pg-core';

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

export const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'unknown'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const POST_TYPES = [
  'reel',
  'carousel',
  'post',
  'video',
  'short',
  'unknown',
] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_CLASSIFICATIONS = [
  'restaurant_related',
  'travel_unrelated_to_restaurants',
  'random_unrelated',
] as const;
export type PostClassification = (typeof POST_CLASSIFICATIONS)[number];

export const CRUMB_STATUSES = ['inbox', 'saved', 'visited'] as const;
export type CrumbStatus = (typeof CRUMB_STATUSES)[number];
