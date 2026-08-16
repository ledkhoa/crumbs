# Summary of Changes: Async Ingestion Engine with Cloudflare Workflows

## 1. Overview
Implemented durable asynchronous ingestion using **Cloudflare Workflows** so that the mobile Share Sheet receives an instant `202 Accepted` response, while heavy scraping, AI structured extraction, and geocoding run in the background.

---

## 2. Modified & Created Files

### A. Configuration & Bindings
* [**`api/wrangler.jsonc`**](file:///Users/khoa/Documents/crumbs/api/wrangler.jsonc):
  * Added `workflows` binding `INGEST_WORKFLOW` mapping to `IngestWorkflow`.
* [**`api/src/types/env.ts`**](file:///Users/khoa/Documents/crumbs/api/src/types/env.ts):
  * Defined `IngestWorkflowParams` (`url`, `guideId`, `userId`).
  * Added `INGEST_WORKFLOW: Workflow<IngestWorkflowParams>` and `GOOGLE_PLACES_API_KEY?: string` to `Bindings`.
* [**`api/drizzle.config.ts`**](file:///Users/khoa/Documents/crumbs/api/drizzle.config.ts):
  * Configured Drizzle Kit for PostgreSQL / Neon Database with migrations path `src/db/migrations`.

### B. Drizzle Database Layer (`api/src/db/`)
* [**`api/src/db/schemas/auth.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/auth.table.ts): BetterAuth tables (`User`, `Session`, `Account`, `Verification`).
* [**`api/src/db/schemas/constants.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/constants.ts): Timestamps with timezone, platform, post type, and crumb status enums.
* [**`api/src/db/schemas/posts.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/posts.table.ts): Canonical posts with unique compound index on `(platform, platform_post_id)`.
* [**`api/src/db/schemas/restaurants.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/restaurants.table.ts): Canonical restaurants with unique index on `google_place_id`, geocoded coordinates, structured opening hours, and `places_last_synced_at` (6-month TTL).
* [**`api/src/db/schemas/postRestaurants.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/postRestaurants.table.ts): Canonical junction table linking posts to restaurants with creator dishes and vibe tags.
* [**`api/src/db/schemas/guides.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/guides.table.ts): User-curated guides.
* [**`api/src/db/schemas/crumbs.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/crumbs.table.ts): User saved spots (`userId`, `restaurantId`, `sourcePostId`, `status: 'inbox' | 'saved' | 'visited'`).
* [**`api/src/db/schemas/guideCrumbs.table.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/guideCrumbs.table.ts): Ordered guide spots (`guideId`, `crumbId`, `orderIndex`).
* [**`api/src/db/schemas/relations.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/schemas/relations.ts): Comprehensive Drizzle relations across all entities.
* [**`api/src/db/client.ts`**](file:///Users/khoa/Documents/crumbs/api/src/db/client.ts): `createDb` factory for `@neondatabase/serverless` connection.

### C. Class-Based Services & Multimodal Vision
* [**`api/src/services/scraper.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/scraper.ts):
  * Scrapes post metadata, identifies `platform_post_id` and `post_type`, and returns all carousel slide URLs.
* [**`api/src/services/ai.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/ai.ts):
  * Multimodal vision extraction using `gemini-3.7-flash` and `Output.object` to OCR graphic carousel slides and video covers.
* [**`api/src/services/places.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/places.ts):
  * Google Places API (New) Text Search with FieldMask for coordinates, address, photos, and ratings.

### D. Workflow Engine & Routes
* [**`api/src/workflows/ingestWorkflow.ts`**](file:///Users/khoa/Documents/crumbs/api/src/workflows/ingestWorkflow.ts):
  * Durable 5-step workflow with exponential retry policies and structured logging.
* [**`api/src/types/crumb.ts`**](file:///Users/khoa/Documents/crumbs/api/src/types/crumb.ts):
  * Unified types: `EnrichedRestaurant`, `MediaSnapshot`, and `ProcessedCrumbPayload`.
* [**`api/src/routes/ingest.ts`**](file:///Users/khoa/Documents/crumbs/api/src/routes/ingest.ts):
  * `POST /api/ingest` and `GET /api/ingest/:instanceId` with typed `ProcessedCrumbPayload`.
