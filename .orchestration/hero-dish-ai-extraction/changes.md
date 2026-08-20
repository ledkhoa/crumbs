# Summary of Changes: Hero Dish AI Extraction & Ingestion Pipeline Polish

## 1. Database Schema Additions
- **`post_restaurants` table**:
  - `hero_dish`: Extracted signature / viral item for the restaurant.
  - `vibe_anchor`: Sensory 3-8 word mood description.
  - `course_category`: `'aperitif' | 'main' | 'dessert' | 'cafe_bakery' | 'cocktail_bar' | 'snack'`.
  - `walk_in_tips`: Tactical advice on lines, booking windows, or seating.
  - `vibe_tags`: 3–6 search filter tags (e.g. `['Date Night', 'Dimly Lit', 'Outdoor Patio']`).
- **`restaurants` table**:
  - `editorial_summary`: Google Places editorial text.
  - `community_favorite_dish`: Tier 2 fallback dish extracted from Google Places reviews when no hero dish was in the social post.
  - `reservation_url`: Direct booking link or smart search deeplink.
  - `reservation_provider`: `'resy' | 'opentable' | 'sevenrooms' | 'tock' | 'custom'`.
  - `regular_opening_hours`: Weekly operating hours structure.
- **`posts` table**:
  - `author_username`: Creator handle (e.g. `@baliinsidertravel` or `@nycfoodie`) extracted from Instagram/TikTok via Apify.
- **`crumbs` table**:
  - `user_hero_dish_override`: Tier 3 custom user override for the must-order dish.
- Generated SQL migrations: `0001_elite_doctor_octopus.sql` and `0002_melted_eternity.sql`.

## 2. Intelligence & Enrichment Services
- **`api/src/services/ai.ts`**:
  - Upgraded `extractedRestaurantSchema` with `heroDish`, `vibeAnchor`, `courseCategory`, `walkInTips`, `reservationProvider`, `reservationUrl`, and `vibeTags`.
  - Enforced 3–6 search filter tags in system prompt.
  - Resilient parallel slide downloading (`Promise.allSettled`) with 0-delay text-only fallback to avoid timeouts on edge isolates.
- **`api/src/services/places.ts`**:
  - Extended Google Places API (New) FieldMask.
  - Built `extractCommunityDishFromReviews` for Tier 2 fallback.
  - Upgraded `detectReservationProvider` with 4-tier booking and fallback strategy (direct link $\rightarrow$ smart search deeplink $\rightarrow$ website $\rightarrow$ maps).
- **`api/src/services/scraper.ts`**:
  - Extracted creator `authorUsername` from Instagram and TikTok Apify datasets.

## 3. Workflow & Fast-Path Updates
- **`api/src/workflows/ingestWorkflow.ts`**:
  - Step 3 resolves Google Places with Tier 2 fallback when `heroDish` is missing.
  - Step 5 persists all new columns into Neon DB via Drizzle ORM.
- **`api/src/routes/ingest.ts`**:
  - Refactored Fast-Path cache hit response to return structured per-table data (`data.post`, `data.restaurants` with `postAttribution`, and `data.crumbs`).
  - Allows instant cache hits (< 50ms) for all analyzed posts, even if 0 restaurants were extracted.

