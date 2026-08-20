import {
  pgTable,
  uuid,
  text,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';
import { Posts } from './posts.table';
import { Restaurants } from './restaurants.table';

export const PostRestaurants = pgTable(
  'post_restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => Posts.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => Restaurants.id, { onDelete: 'cascade' }),
    recommendedDishes: jsonb('recommended_dishes')
      .$type<string[]>()
      .default([])
      .notNull(),
    heroDish: text('hero_dish'),
    vibeAnchor: text('vibe_anchor'),
    courseCategory: text('course_category'),
    walkInTips: text('walk_in_tips'),
    vibeTags: jsonb('vibe_tags').$type<string[]>().default([]).notNull(),
    creatorNotes: text('creator_notes'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('post_restaurants_post_restaurant_uidx').on(
      table.postId,
      table.restaurantId,
    ),
    index('post_restaurants_post_id_idx').on(table.postId),
    index('post_restaurants_restaurant_id_idx').on(table.restaurantId),
  ],
);

export type PostRestaurant = typeof PostRestaurants.$inferSelect;
export type NewPostRestaurant = typeof PostRestaurants.$inferInsert;
