import { relations } from 'drizzle-orm';
import { User } from './auth.table';
import { Posts } from './posts.table';
import { Restaurants } from './restaurants.table';
import { PostRestaurants } from './postRestaurants.table';
import { Guides } from './guides.table';
import { Crumbs } from './crumbs.table';
import { GuideCrumbs } from './guideCrumbs.table';

export const userDomainRelations = relations(User, ({ many }) => ({
  guides: many(Guides),
  crumbs: many(Crumbs),
}));

export const postsRelations = relations(Posts, ({ many }) => ({
  postRestaurants: many(PostRestaurants),
  crumbs: many(Crumbs),
}));

export const restaurantsRelations = relations(Restaurants, ({ many }) => ({
  postRestaurants: many(PostRestaurants),
  crumbs: many(Crumbs),
}));

export const postRestaurantsRelations = relations(
  PostRestaurants,
  ({ one }) => ({
    post: one(Posts, {
      fields: [PostRestaurants.postId],
      references: [Posts.id],
    }),
    restaurant: one(Restaurants, {
      fields: [PostRestaurants.restaurantId],
      references: [Restaurants.id],
    }),
  }),
);

export const guidesRelations = relations(Guides, ({ one, many }) => ({
  user: one(User, {
    fields: [Guides.userId],
    references: [User.id],
  }),
  guideCrumbs: many(GuideCrumbs),
}));

export const crumbsRelations = relations(Crumbs, ({ one, many }) => ({
  user: one(User, {
    fields: [Crumbs.userId],
    references: [User.id],
  }),
  restaurant: one(Restaurants, {
    fields: [Crumbs.restaurantId],
    references: [Restaurants.id],
  }),
  sourcePost: one(Posts, {
    fields: [Crumbs.sourcePostId],
    references: [Posts.id],
  }),
  guideCrumbs: many(GuideCrumbs),
}));

export const guideCrumbsRelations = relations(GuideCrumbs, ({ one }) => ({
  guide: one(Guides, {
    fields: [GuideCrumbs.guideId],
    references: [Guides.id],
  }),
  crumb: one(Crumbs, {
    fields: [GuideCrumbs.crumbId],
    references: [Crumbs.id],
  }),
}));
