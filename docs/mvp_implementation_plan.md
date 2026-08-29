# Crumbs MVP: Technical Implementation Plan & Progress Tracking

> **Target Platform:** Mobile App (React Native & Expo SDK 57+, Expo Router, Reanimated) + Edge Backend (Cloudflare Workers, Cloudflare Workflows, Hono, Drizzle ORM, Neon PostgreSQL)  
> **Core Identity:** "Spotify for Cravings" — Opinionated, High-Intent Culinary Utility.  
> **Last Updated:** August 28, 2026

---

## 1. Executive MVP Status Summary

```
Overall MVP Progress: [████████████████░░░░] 80% Complete
```

| Area | Status | Progress | Key Deliverables |
| :--- | :---: | :---: | :--- |
| **1. Ingestion Pipeline & AI Engine** | 🟢 Done | **100%** | Gemini 2.5 Flash extraction, Apify scrapers, Google Places API (New), 3-tier Hero Dish fallback, timezone-aware hours, <50ms fast-path. |
| **2. Backend API & Auth Services** | 🟢 Done | **100%** | Cloudflare Workers + Workflows, BetterAuth, Drizzle ORM, CRUD for Crumbs, Guides, Ingestion status, unread counts. |
| **3. Inbox & Ingestion UI** | 🟢 Done | **100%** | Background ingestion poller, in-app toast banners, uncategorized filters, swipe actions, unread badge counter & auto-read marking. |
| **4. Guides & Organization** | 🟢 Done | **95%** | Dynamic collage covers (1 hero, 2 split, 3 magazine, 4+ 2x2 grid), skeleton loader, floating action button (FAB), create/edit guides modal. |
| **5. Crumb Details & Tactical Utility** | 🟢 Done | **100%** | Media carousel, Hero Dish inline editor, live timezone-aware Open Now calculator, default native maps launcher, Resy/OpenTable booking, visited toggle. |
| **6. Cravings Map** | 🟡 In Progress | **70%** | Interactive MapView, custom crumb pins, cluster cards, category filters. |
| **7. Food Crawl Sequencer** | 🔴 Next Up | **0%** | Meal course sequencing algorithm (Apéritif $\rightarrow$ Main $\rightarrow$ Dessert/Bar) + walking timeline. |
| **8. Digital Tasting Menu & Guide Clone** | 🔴 Next Up | **0%** | Dynamic tasting menu payload, 1-tap clone API (`POST /guides/:id/clone`), export graphic generator. |

---

## 2. Feature Gap Analysis: Implemented vs. Needed

| MVP Feature / Pillar | Status | Currently Implemented | Remaining Work |
| :--- | :---: | :--- | :--- |
| **1. "The Hero Dish" AI Extraction & 3-Tier Fallback** | 🟢 **100%** | • Gemini Vision extraction with explicit `heroDish`, `vibeAnchor`, `courseCategory`, `walkInTips`, `vibeTags`, `recommendedDishes`.<br>• **Tier 1 (UI Primary):** `post_restaurants.hero_dish` (*"The Must-Order: Spicy Rigatoni"*).<br>• **Tier 2 (UI Fallback):** `restaurants.community_favorite_dish` from Google Places reviews.<br>• **Tier 3 (User Override):** User editable `crumbs.user_hero_dish_override` with inline editing on Crumb Details. | *Complete & verified.* |
| **2. Direct Transactional Utility & Directions** | 🟢 **100%** | • **Tier 1 (Direct Booking):** `restaurants.reservation_url` + `reservation_provider` (Resy, OpenTable, SevenRooms, Tock).<br>• **Tier 2 (Smart Search Deeplink):** Auto-generated provider search URL.<br>• **Tier 3 (Website Fallback):** Direct link to restaurant website.<br>• **Native Directions Opener:** `openDefaultMaps()` launches Apple Maps on iOS and Google Maps on Android with address/coordinates.<br>• **Live Timezone-Aware Hours:** `getRestaurantOpenStatus()` computes real-time open status from `utcOffsetMinutes`, supporting cross-midnight shifts and today row highlighting. | *Complete & verified.* |
| **3. Ingestion State Machine & Background Poller** | 🟢 **100%** | • Cloudflare Workflows durable async ingestion pipeline.<br>• Client-side background ingestion poller with `InAppToastBanner` animations.<br>• Instant Fast-Path cache hit (`< 50ms`) for duplicate post URLs.<br>• Multi-crumb roundup picker sheet & error recovery states. | *Complete & verified.* |
| **4. Inbox & Organization** | 🟢 **100%** | • Filter pills (`All` vs `Unorganized`).<br>• Skeleton loading placeholders (`InboxSkeletonList`).<br>• Unread crumb badge tracking synchronized with storage timestamp.<br>• Quick Add to Guide modal with instant optimistic association.<br>• Swipe-to-delete with haptic confirmation. | *Complete & verified.* |
| **5. Guides Experience** | 🟢 **95%** | • Multi-image dynamic cover layout (1 hero, 2 split, 3 magazine, 4+ 2x2 grid with `+N` badge).<br>• Smooth skeleton loading (`GuidesSkeletonList`).<br>• Thumb-reachable Floating Action Button (FAB) placed above native tab bar.<br>• Create Guide modal with emoji selector and privacy toggle. | • Guide detail reordering and drag-and-drop sequencing. |
| **6. Food Crawl Sequencing Engine** | 🔴 **0%** | • `course_category` classified during ingestion (`aperitif`, `main`, `digestif_dessert`, `cafe_bakery`).<br>• Latitude / Longitude coordinates resolved and indexed. | • Backend sequencing endpoint (`POST /crawl/sequence`) ordering spots by dining timeline + walking estimation.<br>• Mobile Food Crawl itinerary view for guides. |
| **7. Digital Tasting Menu (Export & Clone)** | 🔴 **0%** | • Relational guide and crumb schemas in Drizzle ORM. | • Backend endpoint (`GET /guides/:id/tasting-menu`).<br>• 1-Tap Guide Clone endpoint (`POST /guides/:id/clone`).<br>• Mobile image export sheet for Instagram Stories / iMessage. |

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Ingestion & AI Pipeline
        A[Instagram / TikTok URL] --> B[Cloudflare Workflow: Apify Scraper]
        B --> C[Gemini 2.5 Flash Vision: Hero Dish + Vibe Anchor + Walk-in Tips]
        C --> D[Google Places API: Coordinates + UTC Offset + Reviews + Booking]
        D --> E[Drizzle ORM: Upsert Neon DB]
    end

    subgraph Mobile Experience (Expo SDK 57+)
        E --> F[Inbox: Unread Badges & Toast Notifications]
        F --> G[Crumb Details: Hero Dish Override + Live Timezone Hours + Native Maps]
        G --> H[Guides: Dynamic Collage Cards & FAB Creation]
        H --> I[Cravings Map: Living Map View]
    end

    subgraph Upcoming MVP Sprints
        H --> J[Food Crawl Sequencer: Timeline & Walking Distance]
        H --> K[Digital Tasting Menu: Story Card Export & 1-Tap Clone]
    end
```

---

## 4. Execution Milestones & Immediate Next Steps

| Milestone | Deliverable | Status |
| :--- | :--- | :---: |
| **M1: Backend AI & Ingestion Engine** | `api/src/modules/ingest/` (Apify, Gemini, Google Places, Cloudflare Workflows) | 🟢 **Done** |
| **M2: Database Persistence & Fast-Path** | `api/src/core/db/`, `api/src/modules/crumbs/`, `api/src/modules/guides/` | 🟢 **Done** |
| **M3: Mobile Auth & Core Shell** | `mobile/src/app/(auth)/`, `mobile/src/app/(tabs)/` | 🟢 **Done** |
| **M4: Mobile Inbox & Ingestion UI** | `mobile/src/components/ingestion/`, `mobile/src/app/(tabs)/inbox/` | 🟢 **Done** |
| **M5: Crumb Details & Live Hours** | `mobile/src/app/crumbs/[id].tsx`, `mobile/src/utils/opening-hours.ts`, `maps.ts` | 🟢 **Done** |
| **M6: Guides Hub & Dynamic Collages** | `mobile/src/app/(tabs)/guides/`, `mobile/src/components/guides/` | 🟢 **Done** |
| **M7: Cravings Map Polish** | `mobile/src/app/(tabs)/(home)/` | 🟡 **In Progress** |
| **M8: Food Crawl Sequencing Engine** | `api/src/modules/crawl/` + Mobile Timeline View | 🔴 **Next Sprint** |
| **M9: Digital Tasting Menu & 1-Tap Clone** | `api/src/modules/guides/` clone + Mobile Export Sheet | 🔴 **Next Sprint** |

---

## 5. Next Focus: Food Crawl & Tasting Menu
1. **Food Crawl Sequencing**:
   - Backend logic in `api/src/modules/crawl/` to sequence spots by course type (`aperitif` $\rightarrow$ `main` $\rightarrow$ `digestif_dessert`) and compute walking distance between coordinates.
   - UI on mobile to toggle a Guide into an interactive crawl timeline.
2. **Digital Tasting Menu & Clone**:
   - `POST /guides/:id/clone` API to clone a guide and its crumbs.
   - Story card exporter for sharing curated guides on Instagram Stories and messaging apps.
