import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';
import type { MediaSnapshot } from '../../types/crumb';

export const Posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platform: varchar('platform', { length: 32 }).notNull(),
    postType: varchar('post_type', { length: 32 }).default('unknown').notNull(),
    platformPostId: varchar('platform_post_id', { length: 128 }).notNull(),
    originalUrl: text('original_url').notNull(),
    caption: text('caption'),
    locationName: varchar('location_name', { length: 255 }),
    authorUsername: varchar('author_username', { length: 128 }),
    mediaUrls: jsonb('media_urls').$type<string[]>().default([]).notNull(),
    mediaSnapshot: jsonb('media_snapshot').$type<MediaSnapshot>(),
    classification: varchar('classification', { length: 64 }).notNull(),
    summary: text('summary'),
    rawMetadataJson: text('raw_metadata_json'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('posts_platform_post_id_uidx').on(
      table.platform,
      table.platformPostId,
    ),
  ],
);

export type Post = typeof Posts.$inferSelect;
export type NewPost = typeof Posts.$inferInsert;
