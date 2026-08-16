# Technical Specification: Async Ingestion Engine with Cloudflare Workflows

## 1. Overview
The Crumbs Ingestion Engine handles incoming social media links (Instagram Reels, TikTok) shared from the mobile app's Share Sheet without blocking the client. We implement **Cloudflare Workflows** to orchestrate asynchronous scraping, AI extraction, geocoding, and persistence with automatic step retries and durability.

---

## 2. Architecture & Components

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile App / Share Sheet
    participant API as Hono Ingest Route (POST /api/ingest)
    participant WF as Cloudflare Workflow (IngestWorkflow)
    participant Scraper as Scraper Service (Apify / Mock)
    participant AI as Gemini 2.5 Flash (AI SDK)
    participant Places as Geocoding Service

    User->>API: POST /api/ingest { url, guideId? }
    API->>WF: c.env.INGEST_WORKFLOW.create({ params })
    API-->>User: 202 Accepted { success: true, workflowId, status: "queued" }
    
    rect rgb(240, 248, 255)
        Note over WF: Cloudflare Workflows Background Execution
        WF->>Scraper: step.do("scrape-social-post")
        Scraper-->>WF: Raw caption, location, media URLs
        WF->>AI: step.do("extract-restaurant-details")
        AI-->>WF: Structured restaurant entity & vibe tags
        WF->>Places: step.do("resolve-coordinates")
        Places-->>WF: Lat/lng, placeId, map link
        WF->>WF: step.do("cache-thumbnail-snapshot") [TODO R2]
        WF->>WF: step.do("persist-and-log") [Logs to console, NeonDB ready]
    end

    User->>API: GET /api/ingest/:instanceId (Polling)
    API-->>User: 200 OK { status: "complete" | "running", data }
```

---

## 3. Agreed Decisions

1. **Persistence Target:** Log workflow results to console and return the normalized payload from the workflow instance; full Drizzle + NeonDB integration will follow in a subsequent phase.
2. **Thumbnail Storage:** Add a distinct `cache-thumbnail-snapshot` workflow step with a structured TODO for Cloudflare R2 bucket integration.
3. **Async Exclusivity:** All ingestion runs asynchronously via `INGEST_WORKFLOW`.

---

## 4. Implementation Details

### A. Configuration & Types
* Update [`wrangler.jsonc`](file:///Users/khoa/Documents/crumbs/api/wrangler.jsonc):
  * Register the workflow binding `INGEST_WORKFLOW` mapping to class `IngestWorkflow`.
* Update [`src/types/env.ts`](file:///Users/khoa/Documents/crumbs/api/src/types/env.ts):
  * Define `IngestWorkflowParams` (`url: string`, `guideId?: string`, `userId?: string`).
  * Add `INGEST_WORKFLOW: Workflow<IngestWorkflowParams>` to `Bindings`.

### B. Ingest Workflow Implementation
* Create [`src/workflows/ingestWorkflow.ts`](file:///Users/khoa/Documents/crumbs/api/src/workflows/ingestWorkflow.ts):
  * `IngestWorkflow extends WorkflowEntrypoint<Bindings, IngestWorkflowParams>`
  * **Step 1 (`scrape-social-post`)**: Calls `scrapeSocialPost(url, env.APIFY_TOKEN)`.
  * **Step 2 (`extract-restaurant-details`)**: Calls `extractRestaurantDetails(scraped, env.GOOGLE_GENERATIVE_AI_API_KEY)` using Gemini 2.5 Flash + Zod schema.
  * **Step 3 (`resolve-coordinates`)**: Calls `resolvePlaceCoordinates` for each extracted restaurant.
  * **Step 4 (`cache-thumbnail-snapshot`)**: Prepares media snapshot structure with TODO for Cloudflare R2 upload.
  * **Step 5 (`persist-and-log`)**: Logs structured crumb output and returns the final object.

### C. API Endpoints
* Update [`src/routes/ingest.ts`](file:///Users/khoa/Documents/crumbs/api/src/routes/ingest.ts):
  * `POST /api/ingest`: Creates workflow instance via `c.env.INGEST_WORKFLOW.create()` and returns `202 Accepted` with `workflowId`.
  * `GET /api/ingest/:instanceId`: Retrieves workflow instance status using `c.env.INGEST_WORKFLOW.get(instanceId)`.
* Update [`src/index.ts`](file:///Users/khoa/Documents/crumbs/api/src/index.ts):
  * Export `IngestWorkflow` class so Cloudflare Workers runtime can instantiate the workflow entrypoint.
