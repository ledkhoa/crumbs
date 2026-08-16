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
  * Added `INGEST_WORKFLOW: Workflow<IngestWorkflowParams>` to `Bindings`.
* [**`api/worker-configuration.d.ts`**](file:///Users/khoa/Documents/crumbs/api/worker-configuration.d.ts):
  * Generated Cloudflare runtime types via `wrangler types`.
* [**`api/eslint.config.mjs`**](file:///Users/khoa/Documents/crumbs/api/eslint.config.mjs) & [**`api/tsconfig.json`**](file:///Users/khoa/Documents/crumbs/api/tsconfig.json):
  * Configured project types and ignored generated declarations in ESLint.

### B. Workflow Engine
* [**`api/src/workflows/ingestWorkflow.ts`**](file:///Users/khoa/Documents/crumbs/api/src/workflows/ingestWorkflow.ts):
  * Implemented `IngestWorkflow` extending `WorkflowEntrypoint`.
  * **Step 1 (`scrape-social-post`)**: Fetches post caption, location, and media metadata (Apify with dev fallback).
  * **Step 2 (`extract-restaurant-details`)**: Uses Gemini 2.5 Flash + Zod schema to classify content and extract restaurant entities, cuisine, hero dishes, and vibe tags.
  * **Step 3 (`resolve-place-coordinates`)**: Enriches restaurant entities with geocoded coordinates and map links.
  * **Step 4 (`cache-thumbnail-snapshot`)**: Prepares media snapshot object with structured TODO for Cloudflare R2 bucket upload.
  * **Step 5 (`persist-and-log-crumb`)**: Logs structured result and prepares payload for future Drizzle/NeonDB storage.

### C. Routes & Exports
* [**`api/src/routes/ingest.ts`**](file:///Users/khoa/Documents/crumbs/api/src/routes/ingest.ts):
  * `POST /api/ingest`: Dispatches `c.env.INGEST_WORKFLOW.create()` and returns `202 Accepted` with `workflowId`.
  * `GET /api/ingest/:instanceId`: Queries workflow status and output.
* [**`api/src/index.ts`**](file:///Users/khoa/Documents/crumbs/api/src/index.ts):
  * Exported `IngestWorkflow` so Cloudflare runtime binds the workflow class.
* [**`api/agents.md`**](file:///Users/khoa/Documents/crumbs/api/agents.md):
  * Updated directory structure and service flow descriptions.
