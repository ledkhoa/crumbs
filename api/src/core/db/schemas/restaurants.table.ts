import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  numeric,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';

export const Restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    googlePlaceId: varchar('google_place_id', { length: 255 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    formattedAddress: text('formatted_address'),
    city: varchar('city', { length: 128 }),
    neighborhood: varchar('neighborhood', { length: 128 }),
    state: varchar('state', { length: 128 }),
    country: varchar('country', { length: 128 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    cuisine: varchar('cuisine', { length: 128 }),
    rating: numeric('rating', { precision: 3, scale: 2 }),
    userRatingCount: integer('user_rating_count'),
    priceLevel: varchar('price_level', { length: 64 }),
    mapsUrl: text('maps_url'),
    websiteUrl: text('website_url'),
    photoUrl: text('photo_url'),
    editorialSummary: text('editorial_summary'),
    communityFavoriteDish: text('community_favorite_dish'),
    reservationUrl: text('reservation_url'),
    reservationProvider: varchar('reservation_provider', { length: 64 }),
    regularOpeningHours: jsonb('regular_opening_hours'),
    placesLastSyncedAt: timestamp('places_last_synced_at', {
      withTimezone: true,
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('restaurants_google_place_id_uidx').on(table.googlePlaceId),
    index('restaurants_name_city_idx').on(table.name, table.city),
    index('restaurants_neighborhood_idx').on(table.neighborhood),
    index('restaurants_coordinates_idx').on(table.latitude, table.longitude),
  ],
);

export type Restaurant = typeof Restaurants.$inferSelect;
export type NewRestaurant = typeof Restaurants.$inferInsert;
