# Technical Specification: Async Ingestion Engine with Cloudflare Workflows

## 1. Overview
The Crumbs Ingestion Engine handles incoming social media links (Instagram Reels, TikTok) shared from the mobile app's Share Sheet without blocking the client. We implement **Cloudflare Workflows** to orchestrate asynchronous scraping, AI extraction, Google Places address resolution, and Drizzle/Neon database persistence with automatic step retries and durability.

---

## 2. Architecture & Components

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile App / Share Sheet
    participant API as Hono Ingest Route (POST /api/ingest)
    participant WF as Cloudflare Workflow (IngestWorkflow)
    participant Scraper as ScraperService (Apify REST)
    participant AI as AIService (Gemini 3.7 Flash + Vision)
    participant Places as PlacesService (Google Places API New)

    User->>API: POST /api/ingest { url, guideId? }
    API->>WF: c.env.INGEST_WORKFLOW.create({ params })
    API-->>User: 202 Accepted { success: true, workflowId, status: "queued" }
    
    rect rgb(240, 248, 255)
        Note over WF: Cloudflare Workflows Background Execution
        WF->>Scraper: step.do("scrape-social-post", { retries: 3 })
        Scraper-->>WF: Raw caption, location, media URLs, platformPostId, postType
        WF->>AI: step.do("extract-restaurant-details", { retries: 2 })
        AI-->>WF: Structured restaurant entities, hero dishes, vibe tags (via Vision)
        WF->>Places: step.do("resolve-place-coordinates", { retries: 2 })
        Places-->>WF: Exact address, lat/lng, Place ID, Maps URL, photos
        WF->>WF: step.do("cache-thumbnail-snapshot") [TODO R2]
        WF->>WF: step.do("persist-and-log-crumb") [Logs to console, NeonDB ready]
    end

    User->>API: GET /api/ingest/:instanceId (Polling)
    API-->>User: 200 OK { status: "complete" | "running", output: ProcessedCrumbPayload }
```

---

## 3. Database & Entity Architecture (Drizzle ORM / Neon PostgreSQL)

```mermaid
erDiagram
    USERS ||--o{ GUIDES : creates
    USERS ||--o{ CRUMBS : saves
    POSTS ||--o{ POST_RESTAURANTS : features
    RESTAURANTS ||--o{ POST_RESTAURANTS : featured_in
    POSTS ||--o{ CRUMBS : source_post
    RESTAURANTS ||--o{ CRUMBS : saved_restaurant
    GUIDES ||--o{ GUIDE_CRUMBS : groups
    CRUMBS ||--o{ GUIDE_CRUMBS : placed_in

    USERS {
        uuid id PK
        string email UK
        string name
        boolean email_verified
    }

    POSTS {
        uuid id PK
        string platform
        string post_type
        string platform_post_id UK
        text original_url
        text caption
        jsonb media_urls
    }

    RESTAURANTS {
        uuid id PK
        string google_place_id UK
        string name
        float latitude
        float longitude
        timestamp places_last_synced_at
    }

    POST_RESTAURANTS {
        uuid id PK
        uuid post_id FK
        uuid restaurant_id FK
        jsonb recommended_dishes
        jsonb vibe_tags
    }

    GUIDES {
        uuid id PK
        uuid user_id FK
        string name
    }

    CRUMBS {
        uuid id PK
        uuid user_id FK
        uuid restaurant_id FK
        uuid source_post_id FK
        string status "inbox | saved | visited"
    }

    GUIDE_CRUMBS {
        uuid id PK
        uuid guide_id FK
        uuid crumb_id FK
        int order_index
    }
```
