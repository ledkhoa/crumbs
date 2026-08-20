# Technical Specification: Hero Dish AI Extraction & 3-Tier Fallback

## 1. Goal
Implement structured Hero Dish extraction, Vibe Anchor, Course Category classification, Walk-in Tips extraction, Google Places editorial & review fallback (Tier 2), user hero dish override (Tier 3), and database persistence.

## 2. Component Specifications

### 2.1 Database Schema (`api/src/db/schemas/`)
1. **`postRestaurants.table.ts`**:
   - `heroDish`: `text('hero_dish')`
   - `vibeAnchor`: `text('vibe_anchor')`
   - `courseCategory`: `text('course_category')`
   - `walkInTips`: `text('walk_in_tips')`
2. **`restaurants.table.ts`**:
   - `communityFavoriteDish`: `text('community_favorite_dish')`
   - `editorialSummary`: `text('editorial_summary')`
   - `reservationUrl`: `text('reservation_url')`
   - `reservationProvider`: `text('reservation_provider')`
3. **`crumbs.table.ts`**:
   - `userHeroDishOverride`: `text('user_hero_dish_override')`

### 2.2 AI Extraction Service (`api/src/services/ai.ts`)
- Update `extractedRestaurantSchema` with Zod fields:
  - `heroDish: z.string().optional()`
  - `vibeAnchor: z.string().optional()`
  - `courseCategory: z.enum(['aperitif', 'main', 'dessert', 'cafe_bakery', 'cocktail_bar', 'snack']).optional()`
  - `walkInTips: z.string().optional()`
- Update Gemini system prompt to explicitly enforce extracting the single most featured item as `heroDish` and crafting a 3-8 word sensory mood phrase as `vibeAnchor`.

### 2.3 Places Service (`api/src/services/places.ts`)
- Add `places.editorialSummary` and `places.reviews` to Google Places API (New) FieldMask.
- Detect reservation platform from `websiteUri` (`resy`, `opentable`, `sevenrooms`, `tock`).
- Heuristic review extractor for `communityFavoriteDish` when no `heroDish` is provided by AI.

### 2.4 Types & Ingest Workflow (`api/src/types/crumb.ts`, `api/src/workflows/ingestWorkflow.ts`)
- Update `EnrichedRestaurant` and `ProcessedCrumbPayload` interfaces.
- In Step 3: Trigger Tier 2 resolution if `heroDish` is not present.
- In Step 5: Persist all new columns into Drizzle ORM upsert operations.

## 3. Migration & Verification
- Run `bun run db:generate` to produce the SQL migration.
- Run `bun run cf-typegen && bun run format && bun run check`.
