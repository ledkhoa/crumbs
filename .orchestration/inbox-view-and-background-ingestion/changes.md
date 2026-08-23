# Crumbs Inbox View, Compact Crumb Card & Background Ingestion Implementation Summary

## 1. Executive Summary

Implemented the complete Inbox View, Compact Crumb Card, and Background Ingestion tracking architecture for the Crumbs mobile application and backend API.

This feature enables users to triage newly ingested culinary recommendations captured from Instagram Reels and TikTok, organize them into guides, book tables via reservation links, and track async Cloudflare Workflows in the background without blocking ongoing app navigation.

---

## 2. Completed Deliverables

### 2.1 Backend CRUD & Enriched Query Engine (`api/`)
- [`api/src/modules/crumbs/crumbs.types.ts`](file:///Users/khoa/Documents/crumbs/api/src/modules/crumbs/crumbs.types.ts):
  - Defined `CrumbFilterOptions`, `CrumbPostAttribution`, `EnrichedUserCrumb`, `ListCrumbsResponse`, and `UpdateCrumbInput`.
- [`api/src/modules/crumbs/crumbs.repository.ts`](file:///Users/khoa/Documents/crumbs/api/src/modules/crumbs/crumbs.repository.ts):
  - `listUserCrumbs`: Computes 3-tier effective hero dishes (`userHeroDishOverride` -> `pr.heroDish` -> `communityFavoriteDish`), resolves `PostRestaurants` attributions, joined `Guides`, and handles multi-criteria filtering (`status`, `unorganized`, `bookable`, `guideId`, `neighborhood`, `search`).
  - `update`: Updates crumb status, personal notes, or hero dish override.
  - `delete`: Removes a crumb and cleans up associations.
- [`api/src/modules/crumbs/crumbs.route.ts`](file:///Users/khoa/Documents/crumbs/api/src/modules/crumbs/crumbs.route.ts):
  - `GET /crumbs`: Returns enriched crumbs and unorganized / bookable aggregate counts.
  - `PATCH /crumbs/:id`: Updates crumb properties.
  - `DELETE /crumbs/:id`: Deletes crumb with auth validation.
- [`api/src/modules/crumbs/crumbs.route.test.ts`](file:///Users/khoa/Documents/crumbs/api/src/modules/crumbs/crumbs.route.test.ts):
  - Added unit and auth rejection tests for all CRUD endpoints.

### 2.2 Mobile Client State & Persistent Storage (`mobile/`)
- [`mobile/src/store/inbox.ts`](file:///Users/khoa/Documents/crumbs/mobile/src/store/inbox.ts):
  - Zustand store persisted with MMKV (`zustandMMKVStorage`).
  - Tracks `lastInboxViewedAt` timestamp for unread calculation.
  - Tracks running async background jobs in `activeBackgroundJobs`.
  - Manages `activeToast` lifecycle.
- [`mobile/src/hooks/useCrumbs.ts`](file:///Users/khoa/Documents/crumbs/mobile/src/hooks/useCrumbs.ts):
  - `useCrumbsQuery`: Queries enriched crumbs with search, unorganized, bookable, and neighborhood filters.
  - `useUpdateCrumbMutation`: Updates crumb notes/status with cache invalidation and tactile haptics.
  - `useDeleteCrumbMutation`: Deletes crumbs with `haptics.heavy()`.
  - `useUnreadCrumbsCount`: Computes real-time unread count (`createdAt > lastInboxViewedAt`).

### 2.3 Background Polling & In-App Non-Modal Toast Banner
- [`mobile/src/components/ingestion/BackgroundIngestionPoller.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/ingestion/BackgroundIngestionPoller.tsx):
  - Root-mounted background poller monitoring active Cloudflare Workflow executions (1500ms intervals).
  - Handles workflow completion, invalidates TanStack Query cache (`QUERY_KEYS.crumbs.all`), triggers `haptics.success()`, and shows the in-app toast banner.
- [`mobile/src/components/inbox/InAppToastBanner.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/inbox/InAppToastBanner.tsx) & [`mobile/src/components/ui/InAppToast.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/ui/InAppToast.tsx):
  - Reanimated 3 slide-down top floating notification banner anchored to safe-area top inset.
  - 44x44 thumbnail, "Captured to Inbox! 🌿" success header, Georgia restaurant title, hero dish pill, and direct `[ 🗺️ Guide ]` action.
  - 6000ms auto-dismiss timer.
- [`mobile/src/app/_layout.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/app/_layout.tsx):
  - Mounted `BackgroundIngestionPoller`, `InAppToastBanner`, and `QuickAddToGuideModal`.
  - Wired `onRunInBackground` in `IngestionOverlaySheet` to register active workflow jobs.

### 2.4 Compact Crumb Card & Interactive Inbox Screen
- [`mobile/src/components/crumbs/CompactCrumbCard.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/crumbs/CompactCrumbCard.tsx):
  - 108pt horizontal card layout with 88x88 photography thumbnail, platform watermark (`📸`/`🎵`).
  - Georgia serif title (15pt bold), price/rating badge (`$$$ · 4.6 ★`), location & creator provenance (`@creator`), hero dish highlight (`🍝 MUST-ORDER: ...`), vibe tags, and quick mini actions (`[ 🗺️ + ]` / `[ 🍷 Book ]` / `[ 📍 Map ]`).
- [`mobile/src/components/inbox/InboxFilterBar.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/inbox/InboxFilterBar.tsx):
  - Filter chips for `⚡ Unorganized`, `All`, `🍷 Bookable`, and dynamic neighborhood chips with `haptics.selection()`.
- [`mobile/src/app/(tabs)/inbox/index.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/inbox/index.tsx):
  - Complete triage interface with Georgia header, unsaved counter badge, debounced `SearchInput`, filter chips, `FlatList` with `RefreshControl`, zero-inbox `EmptyState` with "Explore City Map" action, and focus effect (`markInboxAsViewed`).
- [`mobile/src/app/(tabs)/_layout.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/_layout.tsx):
  - Dynamic `NativeTabs.Trigger.Badge` bound to `useUnreadCrumbsCount()`.

---

## 3. Verification & Quality Assurance

- **Backend Tests (`bun test src/`)**: 41/41 tests passing.
- **Mobile Tests (`bun test src/`)**: 23/23 tests passing.
- **Type Checking (`tsc --noEmit`)**: 0 errors across API and Mobile.
- **Linting (`oxlint .`)**: 0 warnings, full compliance with anti-slop rules (`SAFETY:` justifications on type assertions).
- **Formatting (`prettier --check`)**: All files formatted according to repository guidelines.
