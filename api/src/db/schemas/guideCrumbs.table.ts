import {
  pgTable,
  uuid,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './constants';
import { Guides } from './guides.table';
import { Crumbs } from './crumbs.table';

export const GuideCrumbs = pgTable(
  'guide_crumbs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => Guides.id, { onDelete: 'cascade' }),
    crumbId: uuid('crumb_id')
      .notNull()
      .references(() => Crumbs.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('guide_crumbs_guide_crumb_uidx').on(
      table.guideId,
      table.crumbId,
    ),
    index('guide_crumbs_guide_id_idx').on(table.guideId),
    index('guide_crumbs_crumb_id_idx').on(table.crumbId),
  ],
);

export type GuideCrumb = typeof GuideCrumbs.$inferSelect;
export type NewGuideCrumb = typeof GuideCrumbs.$inferInsert;
