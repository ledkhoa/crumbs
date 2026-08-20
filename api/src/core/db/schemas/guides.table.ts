import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';
import { User } from './auth.table';

export const Guides = pgTable(
  'guides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    emojiIcon: varchar('emoji_icon', { length: 32 }),
    coverImageUrl: text('cover_image_url'),
    isPublic: boolean('is_public').default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index('guides_user_id_idx').on(table.userId),
    index('guides_is_public_idx').on(table.isPublic),
  ],
);

export type Guide = typeof Guides.$inferSelect;
export type NewGuide = typeof Guides.$inferInsert;
