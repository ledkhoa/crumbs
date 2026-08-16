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
* [**`api/worker-configuration.d.ts`**](file:///Users/khoa/Documents/crumbs/api/worker-configuration.d.ts):
  * Generated Cloudflare runtime types via `wrangler types`.
* [**`api/eslint.config.mjs`**](file:///Users/khoa/Documents/crumbs/api/eslint.config.mjs) & [**`api/tsconfig.json`**](file:///Users/khoa/Documents/crumbs/api/tsconfig.json):
  * Configured project types and ignored generated declarations in ESLint.

### B. Class-Based Services (Dependency Injection)
* [**`api/src/services/scraper.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/scraper.ts):
  * Implemented `ScraperService` wrapping the official `apify-client` SDK.
  * Added typed `ScraperError` with specific error codes (`TOKEN_MISSING`, `SCRAPE_FAILED`, `NO_DATA_RETURNED`, `UNSUPPORTED_PLATFORM`).
  * Removed dirty mock fallbacks in favor of explicit, retryable exceptions.
* [**`api/src/services/ai.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/ai.ts):
  * Implemented `AIService` using modern `generateText({ output: Output.object({ schema }) })` pattern (replacing deprecated `generateObject`).
* [**`api/src/services/places.ts`**](file:///Users/khoa/Documents/crumbs/api/src/services/places.ts):
  * Implemented `PlacesService` using **Google Places API (New)** Text Search (`https://places.googleapis.com/v1/places:searchText`) with exact address, lat/lng coordinates, photos, ratings, and Google Maps URIs.

### C. Workflow Engine
* [**`api/src/workflows/ingestWorkflow.ts`**](file:///Users/khoa/Documents/crumbs/api/src/workflows/ingestWorkflow.ts):
  * Implemented `IngestWorkflow` extending `WorkflowEntrypoint`.
  * Instantiates `ScraperService`, `AIService`, and `PlacesService` once with environment bindings.
  * **Step 1 (`scrape-social-post`)**: Scrapes metadata with automatic exponential retry policy (`retries: { limit: 3, delay: '5s', backoff: 'exponential' }`).
  * **Step 2 (`extract-restaurant-details`)**: Structured restaurant entity and vibe extraction with Gemini 2.5 Flash.
  * **Step 3 (`resolve-place-coordinates`)**: Enriches restaurant entities with exact addresses and coordinates via Google Places API (New).
  * **Step 4 (`cache-thumbnail-snapshot`)**: Prepares media snapshot metadata (with TODO for Cloudflare R2 bucket storage).
  * **Step 5 (`persist-and-log-crumb`)**: Logs structured result and prepares payload for future Drizzle/NeonDB storage.

### D. Routes & Documentation
* [**`api/src/routes/ingest.ts`**](file:///Users/khoa/Documents/crumbs/api/src/routes/ingest.ts):
  * `POST /api/ingest`: Dispatches `c.env.INGEST_WORKFLOW.create()` and returns `202 Accepted` with `workflowId`.
  * `GET /api/ingest/:instanceId`: Queries workflow status and output.
* [**`api/src/index.ts`**](file:///Users/khoa/Documents/crumbs/api/src/index.ts):
  * Exported `IngestWorkflow` for Cloudflare Workers runtime.
* [**`api/agents.md`**](file:///Users/khoa/Documents/crumbs/api/agents.md):
  * Added Service Architecture Standards (Class-Based Services & Dependency Injection) and updated Failure Log.
