# Crumbs MVP: Technical Implementation Plan & Progress Tracking

> **Target Platform:** Mobile App (React Native & Expo SDK 57+, Expo Router, Reanimated) + Edge Backend (Cloudflare Workers, Cloudflare Workflows, Hono, Drizzle ORM, Neon PostgreSQL)  
> **Core Identity:** "Spotify for Cravings" — Opinionated, High-Intent Culinary Utility.  
> **Last Updated:** August 30, 2026

---

## 1. Executive MVP Status Summary

```
Overall MVP Progress: [████████████████░░░░] 78% Complete (Scope Expanded to Production Readiness)
```

| Area | Status | Progress | Key Deliverables |
| :--- | :---: | :---: | :--- |
| **1. Ingestion Pipeline & AI Engine** | 🟢 Done | **100%** | Gemini 2.5 Flash extraction, Apify scrapers, Google Places API (New), 3-tier Hero Dish fallback, timezone-aware hours, <50ms fast-path, RPC capability disposal. |
| **2. Backend API & Auth Services** | 🟢 Done | **100%** | Cloudflare Workers + Workflows, BetterAuth (native Origin & CSRF support), Drizzle ORM, dynamic `status` (inbox/saved/visited) derivation from `guide_crumbs`, `GET /crumbs/counts`. |
| **3. Inbox & Ingestion UI** | 🟢 Done | **100%** | Background ingestion poller, in-app toast banners, 2-segment filter bar (`⚡ Uncategorized` vs `All`), animated skeleton loader (`InboxSkeletonList`), AI search placeholder, unread badge counter. |
| **4. Guides & Collections** | 🟢 Done | **95%** | Dynamic collage covers (1 hero, 2 split, 3 magazine, 4+ 2x2 grid), skeleton loader, floating action button (FAB), create/edit guides modal, guide detail crumb manager. |
| **5. Crumb Details & Tactical Utility** | 🟢 Done | **100%** | Media carousel, Hero Dish inline editor, live timezone-aware Open Now calculator, default native maps launcher, Resy/OpenTable booking, visited toggle. |
| **6. Cravings Map (Living Map)** | 🟢 Done | **100%** | Interactive MapView, custom squircle pins with glow shadows & visited ✓ badges, spatial grid clustering, 3-detent drawer with magnetic haptics, auto-snap to mid height, time-adaptive dining moments, and `MapCrumbDetailCard`. |
| **7. Profile & Account Core** | 🟢 Done | **90%** | Moody hero background auth screens, Profile tab with user identity card, curation stats, and instant sign-out flow. *(Pending: Account Deletion)* |
| **8. Monetization & Paywall (RevenueCat)** | 🔴 Planned | **0%** | RevenueCat SDK integration, Paywall Sheet UI, 10-import free allowance, 3-guide limit, Pro subscription entitlements. |
| **9. Analytics & AI Cost Observability (PostHog)** | 🔴 Planned | **0%** | PostHog React Native SDK client tracking, API ingestion metrics, Gemini token tracking, Apify duration telemetry. |
| **10. Legal & Apple App Store Compliance** | 🔴 Planned | **0%** | Apple Account Deletion (`DELETE /auth/account`), Privacy Policy & Terms of Service static routes & in-app web views. |
| **11. Food Crawl Sequencer** | 🔴 Next Up | **0%** | Meal course sequencing algorithm (Apéritif $\rightarrow$ Main $\rightarrow$ Dessert/Bar) + walking timeline. |
| **12. Digital Tasting Menu & Guide Clone** | 🔴 Next Up | **0%** | Dynamic tasting menu payload, 1-tap clone API (`POST /guides/:id/clone`), export graphic generator. |

---

## 2. Feature Gap Analysis: Implemented vs. Needed

| MVP Feature / Pillar | Status | Currently Implemented | Remaining Work |
| :--- | :---: | :--- | :--- |
| **1. "The Hero Dish" AI Extraction & 3-Tier Fallback** | 🟢 **100%** | • Gemini Vision extraction with explicit `heroDish`, `vibeAnchor`, `courseCategory`, `walkInTips`, `vibeTags`, `recommendedDishes`.<br>• **Tier 1 (UI Primary):** `post_restaurants.hero_dish` (*"The Must-Order: Spicy Rigatoni"*).<br>• **Tier 2 (UI Fallback):** `restaurants.community_favorite_dish` from Google Places reviews.<br>• **Tier 3 (User Override):** User editable `crumbs.user_hero_dish_override` with inline editing on Crumb Details. | *Complete & verified.* |
| **2. Direct Transactional Utility & Directions** | 🟢 **100%** | • **Tier 1 (Direct Booking):** `restaurants.reservation_url` + `reservation_provider` (Resy, OpenTable, SevenRooms, Tock).<br>• **Tier 2 (Smart Search Deeplink):** Auto-generated provider search URL.<br>• **Tier 3 (Website Fallback):** Direct link to restaurant website.<br>• **Native Directions Opener:** `openDefaultMaps()` launches Apple Maps on iOS and Google Maps on Android with address/coordinates.<br>• **Live Timezone-Aware Hours:** `getRestaurantOpenStatus()` computes real-time open status from `utcOffsetMinutes`, supporting cross-midnight shifts and today row highlighting. | *Complete & verified.* |
| **3. Ingestion State Machine & Background Poller** | 🟢 **100%** | • Cloudflare Workflows durable async ingestion pipeline with explicit RPC stub lifecycle disposal (`disposeRpc`).<br>• Client-side background ingestion poller with `InAppToastBanner` animations (`scheduleOnRN`).<br>• Instant Fast-Path cache hit (`< 50ms`) for duplicate post URLs.<br>• Multi-crumb roundup picker sheet & error recovery states.<br>• In-sheet direct link ingestion onboarding for 0-crumb fresh map state. | *Complete & verified.* |
| **4. Inbox & Organization** | 🟢 **100%** | • Dedicated lightweight counts query (`GET /crumbs/counts`) decoupled from list payloads.<br>• Dynamic inbox vs. saved status derivation from `guide_crumbs` junction table.<br>• 2 clean segments: `⚡ Uncategorized` & `All` with independent TanStack Query keys.<br>• Animated Reanimated v4 skeleton loader (`InboxSkeletonList`).<br>• AI-powered search affordance placeholder (`✨ Ask AI or search cravings...`).<br>• Unread crumb badge tracking synchronized with storage timestamp.<br>• Quick Add to Guide modal with instant optimistic association.<br>• Swipe-to-delete with haptic confirmation. | *Complete & verified.* |
| **5. Guides Experience** | 🟢 **95%** | • Multi-image dynamic cover layout (1 hero, 2 split, 3 magazine, 4+ 2x2 grid with `+N` badge).<br>• Smooth skeleton loading (`GuidesSkeletonList`).<br>• Thumb-reachable Floating Action Button (FAB) placed above native tab bar.<br>• Create & Edit Guide modals with emoji selector and privacy toggle.<br>• Guide detail view with crumb removal and quick-add actions. | • Guide detail drag-and-drop manual reordering. |
| **6. Cravings Map (Living Map)** | 🟢 **100%** | • **Interactive Map Canvas**: Light/dark custom styled MapView with smooth camera offsets.<br>• **Premium Markers**: Squircle photo tiles (`44x44`, `borderRadius: 12`), status-colored glow shadows, visited ✓ checkmark badge overlays, inbox gold dots, top accent stripes, hero dish subtitles.<br>• **Spatial Grid Clustering**: Native clustering with density-scaled bubbles and tap-to-zoom bounds expansion.<br>• **Frosted Bottom Sheet Drawer**: 3-tier magnetic snap detents (`peek`, `mid`, `full`) with magnetic haptic feedback.<br>• **Auto-Snap to Mid**: Clamps sheet height to `MID_HEIGHT` on crumb selection if sheet is pulled above mid height.<br>• **Time-Adaptive Dining Moments**: Contextual moment picker (`Morning`, `Lunch`, `Dinner`, `Late Night`) dynamically resolved against destination timezone.<br>• **MapCrumbDetailCard**: Rich preview card with hero dish highlight, reservation/directions action, and guide badges. | *Complete & verified.* |
| **7. Monetization & Crumbs Pro (RevenueCat)** | 🔴 **0%** | • Defined entitlement tiers: Free (10 imports, 3 guides) vs. Pro (Unlimited imports, unlimited guides, crawl sequencer, 1-tap clone). | • RevenueCat SDK (`react-native-purchases`) setup on mobile.<br>• Paywall modal UI with annual/monthly subscription options.<br>• Server-side webhook (`POST /webhooks/revenuecat`) syncing entitlements in Neon DB.<br>• Feature gating guards on `POST /ingest` and `POST /guides`. |
| **8. Usage & AI Cost Observability** | 🔴 **0%** | • Initial workflow step timing logged to console. | • PostHog React Native client telemetry.<br>• Ingestion tracking (`tokens_used`, `apify_duration_ms`, `fast_path_hit_rate`).<br>• Per-user AI quota counter in Neon DB (`users.ingest_count`). |
| **9. Legal & Apple Account Deletion Compliance** | 🔴 **0%** | • None. | • App Store Review Guideline 5.1.1(v) compliant `DELETE /auth/account` endpoint (Neon cascade delete).<br>• In-app Profile "Delete Account" modal with confirmation.<br>• Privacy Policy & Terms of Service hosted pages + in-app browser links. |
| **10. Food Crawl Sequencing Engine** | 🔴 **0%** | • `course_category` classified during ingestion (`aperitif`, `main`, `digestif_dessert`, `cafe_bakery`).<br>• Latitude / Longitude coordinates resolved and indexed. | • Backend sequencing endpoint (`POST /crawl/sequence`) ordering spots by dining timeline + walking estimation.<br>• Mobile Food Crawl itinerary view for guides. |
| **11. Digital Tasting Menu (Export & Clone)** | 🔴 **0%** | • Relational guide and crumb schemas in Drizzle ORM. | • Backend endpoint (`GET /guides/:id/tasting-menu`).<br>• 1-Tap Guide Clone endpoint (`POST /guides/:id/clone`).<br>• Mobile image export sheet for Instagram Stories / iMessage. |

---

## 3. Crumbs Pro & Monetization Specifications

### A. Free vs. Pro Feature Matrix

| Feature | Free Tier | Crumbs Pro ($4.99/mo or $39.99/yr) |
| :--- | :---: | :---: |
| **Social Video Link Ingestion (AI Extraction)** | **10 imports total** (lifetime free trial) | **Unlimited imports** |
| **Custom Guides** | Up to **3 guides** | **Unlimited guides** |
| **Living Cravings Map & Filters** | Included | Included |
| **Timezone-Aware Open Hours & Booking Links** | Included | Included |
| **Food Crawl Sequencing & Walking Optimizer** | 1 sample crawl preview | **Full unlimited sequencing** |
| **1-Tap Guide Clone & Story Card Export** | — | **Included** |
| **Cloud Sync & Cross-Device Backup** | Included | Included |

### B. Feature Gating Architecture & Flow

1. **Database Schema (`users` / `user_subscriptions` table)**:
   - `users.ingestCount`: Tracks total lifetime social links imported by user.
   - `users.isPro`: Cached boolean flag synced from RevenueCat webhooks.
   - `users.proExpiresAt`: Timestamp of subscription expiration.
2. **Server-Side Enforcement**:
   - `POST /ingest`: If `user.isPro === false && user.ingestCount >= 10`, reject with `403 Forbidden` (`{ error: 'PAYWALL_LIMIT_REACHED', code: 'PRO_REQUIRED' }`) before spinning up Apify scrapers or Gemini extractors.
   - `POST /guides`: If `user.isPro === false && totalUserGuides >= 3`, reject with `403 Forbidden` (`{ error: 'GUIDES_LIMIT_REACHED', code: 'PRO_REQUIRED' }`).
3. **Client-Side Paywall Trigger**:
   - Triggered on 11th import attempt or 4th guide creation.
   - Elegant paywall bottom sheet presenting Pro benefits, monthly/annual toggles, Customer Portal restore, and Free Trial messaging.

---

## 4. Product Analytics & AI Observability (PostHog)

### A. Core Client Events (PostHog React Native)
- `crumb_captured`: Triggered upon successful social link ingestion (`platform`, `has_hero_dish`, `restaurant_name`).
- `paywall_viewed`: Triggered when user encounters gating limit (`source: 'ingest_limit' | 'guide_limit' | 'crawl_feature'`).
- `subscription_started`: Triggered on purchase completion (`package_id`, `price`).
- `guide_created` / `guide_shared`: Guide engagement tracking.
- `reservation_clicked`: User intent signal tracking (`provider: 'resy' | 'opentable' | 'direct'`).
- `directions_opened`: Navigation intent (`app: 'apple_maps' | 'google_maps'`).

### B. Backend AI & Infrastructure Telemetry
- **Gemini Vision Extraction Latency & Tokens**: Logged per workflow step to monitor cost per extraction.
- **Apify Actor Execution Durations**: Monitored to detect scraper slowdowns or rate limits.
- **Fast-Path Cache Hit Rate**: Target $> 35\%$ cache hit rate to minimize external API costs.

---

## 5. Apple & Google Compliance & Legal Requirements

### A. Account Deletion (Apple Guideline 5.1.1(v))
- **Endpoint**: `DELETE /auth/account` (Protected by BetterAuth session token).
- **Purge Sequence**:
  1. Cascade delete all user `crumbs`, `guides`, `guide_crumbs`, and `user_notes` from Neon PostgreSQL (`onDelete: 'cascade'`).
  2. Cancel active RevenueCat subscriber record / alias.
  3. Purge BetterAuth session and user credentials.
- **Mobile UI**:
  - Located in `Profile` tab under a distinct "Danger Zone" section.
  - Two-step confirmation modal: requires explicit tap on *"Delete Account & All Data"*.
  - Immediate local cache reset (`queryClient.clear()`, `clearSession()`), routing user back to Sign In.

### B. Privacy Policy & Terms of Service
- **Endpoints / Static Routes**:
  - `https://api.crumbs.app/legal/privacy` (Privacy Policy)
  - `https://api.crumbs.app/legal/terms` (Terms of Service & EULA)
- **Mobile In-App Access**:
  - Linked from Auth screens (footer note) and Profile tab (Legal section).
  - Opens via `expo-web-browser` / `WebBrowser.openBrowserAsync` inside standard iOS SFSafariViewController so users never leave the app context.

---

## 6. Execution Milestones & Immediate Next Steps

| Milestone | Deliverable | Status |
| :--- | :--- | :---: |
| **M1: Backend AI & Ingestion Engine** | `api/src/modules/ingest/` (Apify, Gemini, Google Places, Cloudflare Workflows, RPC cleanup) | 🟢 **Done** |
| **M2: Database Persistence & Fast-Path** | `api/src/core/db/`, `api/src/modules/crumbs/`, `api/src/modules/guides/`, `GET /crumbs/counts`, dynamic status | 🟢 **Done** |
| **M3: Mobile Auth & Core Shell** | `mobile/src/app/(auth)/`, `mobile/src/app/(tabs)/`, NativeTabs theme styling, Moody Hero screen | 🟢 **Done** |
| **M4: Mobile Inbox & Ingestion UI** | `mobile/src/components/ingestion/`, `mobile/src/app/(tabs)/inbox/`, Skeletons, AI placeholder | 🟢 **Done** |
| **M5: Crumb Details & Live Hours** | `mobile/src/app/crumbs/[id].tsx`, `mobile/src/utils/opening-hours.ts`, `maps.ts` | 🟢 **Done** |
| **M6: Guides Hub & Detail Collection View** | `mobile/src/app/guides/[id].tsx`, `api/src/modules/guides/` (Full CRUD + Modals) | 🟢 **Done** |
| **M7: Cravings Map (Living Map)** | `mobile/src/app/(tabs)/(home)/` (MapView, Squircle Pins, Clustering, Moments Drawer, Detail Card) | 🟢 **Done** |
| **M8: Profile & Identity Management** | `mobile/src/app/(tabs)/profile/` (Curation Stats, Account Details, Sign Out) | 🟢 **Done** |
| **M9: Apple Compliance & Legal Documents** | `DELETE /auth/account`, Privacy Policy & Terms of Service routes + Profile links | 🔴 **Next Up** |
| **M10: PostHog Analytics & Telemetry** | PostHog React Native SDK, Client events, Backend AI token tracking | 🔴 **Next Up** |
| **M11: RevenueCat Monetization & Gating** | RevenueCat SDK, Paywall modal, 10-import & 3-guide limits, API guards | 🔴 **Next Up** |
| **M12: Food Crawl Sequencing & Route Engine** | Progressive Dinner & Walking Tasting Trail | 🔴 **Next Sprint** |
| **M13: Digital Tasting Menu & 1-Tap Clone** | `api/src/modules/guides/` clone + Mobile Export Sheet | 🔴 **Next Sprint** |
| **Post-MVP: AI Craving Search** | `docs/post_mvp_ai_search_plan.md` (Natural language search + Google Places fallback) | 📋 **Planned** |
