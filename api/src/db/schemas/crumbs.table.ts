import {
  pgTable,
  uuid,
  varchar,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';
import { User } from './auth.table';
import { Restaurants } from './restaurants.table';
import { Posts } from './posts.table';

export const Crumbs = pgTable(
  'crumbs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => Restaurants.id, { onDelete: 'cascade' }),
    sourcePostId: uuid('source_post_id').references(() => Posts.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 32 }).default('inbox').notNull(),
    userNotes: text('user_notes'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('crumbs_user_restaurant_uidx').on(
      table.userId,
      table.restaurantId,
    ),
    index('crumbs_user_id_idx').on(table.userId),
    index('crumbs_status_idx').on(table.status),
    index('crumbs_restaurant_id_idx').on(table.restaurantId),
  ],
);

export type Crumb = typeof Crumbs.$inferSelect;
export type NewCrumb = typeof Crumbs.$inferInsert;
