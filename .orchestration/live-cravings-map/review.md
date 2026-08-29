# Architecture & Code Review: Live Cravings Map (Home Tab)

**Review Verdict: APPROVED (PASS)**

---

## 1. Executive Summary & Review Scope

The **Live Cravings Map** feature transforms the mobile Home tab ([`mobile/src/app/(tabs)/(home)/index.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/(home)/index.tsx)) into a living, high-performance geospatial discovery canvas.

This review evaluated all git diffs, newly authored components, hooks, spatial math utilities, type definitions, map styling tokens, and automated test suites against:
- Global development rules in [`AGENTS.md`](file:///Users/khoa/Documents/crumbs/AGENTS.md)
- Mobile agent rules in [`mobile/AGENTS.md`](file:///Users/khoa/Documents/crumbs/mobile/AGENTS.md)
- Design specification: [`.orchestration/live-cravings-map/design.md`](file:///Users/khoa/Documents/crumbs/.orchestration/live-cravings-map/design.md)
- Technical specification: [`.orchestration/live-cravings-map/spec.md`](file:///Users/khoa/Documents/crumbs/.orchestration/live-cravings-map/spec.md)
- Test results: [`.orchestration/live-cravings-map/test-results.md`](file:///Users/khoa/Documents/crumbs/.orchestration/live-cravings-map/test-results.md)

---

## 2. Core Requirements & Invariant Verification

| Invariant / Requirement | Expected Behavior | Implementation Status | Evidence & File Links |
| :--- | :--- | :--- | :--- |
| **1. User Footprint Isolation** | Show strictly crumbs saved by the authenticated user in the app (Inbox, Guides, Visited). Zero unvetted directory pins or ad noise. | **VERIFIED** | [`useMapCrumbs.ts`](file:///Users/khoa/Documents/crumbs/mobile/src/hooks/useMapCrumbs.ts#L57-L82) strictly consumes [`useCrumbsQuery`](file:///Users/khoa/Documents/crumbs/mobile/src/hooks/useCrumbs.ts), querying personal saved bookmarks from TanStack Query cache. Custom styling hides third-party POI business clutter (`poi.business: { visibility: 'off' }`). |
| **2. Geolocation with NYC Fallback** | Request foreground GPS via `expo-location`. On permission denial, restriction, or >3s timeout, gracefully fall back to NYC (`40.7282, -73.9942`) with non-blocking recovery banner. | **VERIFIED** | [`useUserLocation.ts`](file:///Users/khoa/Documents/crumbs/mobile/src/hooks/useUserLocation.ts#L34-L106) implements a 3000ms race timeout, unmounted ref safety, and returns NYC fallback coordinates. [`LocationPermissionBanner.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/map/LocationPermissionBanner.tsx) offers 1-tap permission re-prompt or settings deep-link. |
| **3. Bidirectional Marker $\leftrightarrow$ Carousel Sync** | Pin tap scrolls card carousel; carousel swipe pans map camera without triggering infinite loop oscillation. | **VERIFIED** | Programmatic guard refs (`isProgrammaticMoveRef` in [`HomeScreen`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/(home)/index.tsx#L40) and `isInternalScrollRef` in [`MapCrumbCarousel.tsx`](file:///Users/khoa/Documents/crumbs/mobile/src/components/map/MapCrumbCarousel.tsx#L38)) prevent circular state updates. |
| **4. Card Occlusion Prevention** | Bottom card preview (~140pt) must not obscure the focused pin. | **VERIFIED** | Camera pan targets latitude with upward offset: $\text{targetLat} = \text{lat} - (\text{latDelta} \times 0.15)$ in [`HomeScreen`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/(home)/index.tsx#L123), keeping the pin centered in the upper visible half. |
| **5. "Decide Now" Randomized Craving Sequence** | Filters crumbs in current viewport (or falls back to global), triggers rolling haptics, swoops camera, and focuses card. | **VERIFIED** | Handled in [`HomeScreen.handleDecideNowPress`](file:///Users/khoa/Documents/crumbs/mobile/src/app/(tabs)/(home)/index.tsx#L201-L216) utilizing [`pickRandomCraving`](file:///Users/khoa/Documents/crumbs/mobile/src/utils/map-clustering.ts#L103) and rolling haptic impulses ($3\times$ tap $\rightarrow 1\times$ success). |
| **6. Theming & Token Compliance** | No static hardcoded colors in `StyleSheet.create`. Light/Dark Warm Editorial tokens. | **VERIFIED** | All color properties bind dynamically to `useTheme().colors`. Map style JSON in [`map-theme.ts`](file:///Users/khoa/Documents/crumbs/mobile/src/utils/map-theme.ts) matches Warm Buttercream (`#F7F4EF`), Deep Espresso (`#141210`), Sage (`#DCE8D6`/`#1B2418`), and Muted Blue-Grey (`#D6E4E5`/`#10171D`). |
| **7. Terminology Discipline** | User-facing copy strictly uses "crumbs", "guides", "Cravings Map", "hero dish", "vibe tags" (no "spot/spots"). | **VERIFIED** | Inspected all new files; verified copy (e.g. "Showing NYC · Enable location to see nearby cravings", "Your Cravings Map is Fresh", "Add First Crumb", "No saved cravings in this area"). |
| **8. Safe Areas & Layout** | Floating controls and header respect device safe area insets. | **VERIFIED** | Top header uses `top: insets.top + 8`; bottom carousel uses `bottom: insets.bottom + 8`. |

---

## 3. Code Architecture & Component Breakdown

```
mobile/src/
├── app/(tabs)/(home)/index.tsx           # Home Living Map orchestrator & state sync
├── components/map/
│   ├── LiveCravingsMapView.tsx          # MapView canvas with theme & platform provider switching
│   ├── CrumbMapMarker.tsx               # Custom pin with 1.22x spring scale, status badge, rating
│   ├── MapCrumbCarousel.tsx             # Snapping FlatList with CompactCrumbCard
│   ├── MapFilterBar.tsx                 # Floating search, guide selector modal, quick filter chips
│   ├── MapFloatingControls.tsx          # Recenter (with spinner) & Decide Now capsules
│   ├── LocationPermissionBanner.tsx     # Non-blocking permission recovery banner
│   └── MapEmptyStateOverlay.tsx         # Global fresh & empty viewport states with zoom-to-fit
├── hooks/
│   ├── useUserLocation.ts               # Geolocation state machine with 3000ms timeout
│   └── useMapCrumbs.ts                  # Real-time coordinate & filter synchronization hook
└── utils/
    ├── map-clustering.ts                # Haversine distance, bounding box, viewport testing
    ├── map-filter.ts                    # Keyword cuisine/dish to emoji deduction & crumb filtering
    └── map-theme.ts                     # Light & dark editorial map style tokens
```

---

## 4. Verification & Test Execution Results

All automated checks and test suites pass with zero errors and zero warnings:

- **Mobile Workspace Typecheck & Lint (`bun run check`)**:
  - `tsc --noEmit`: 0 errors
  - `oxlint .`: 0 errors, 0 warnings
  - `prettier . --check`: 100% formatted
- **Mobile Automated Tests (`bun test src`)**:
  - **66 tests passed across 7 test suites** (159 assertions, 0 failures).
  - Validated spatial math (`haversineDistanceMiles`, `getBoundingRegionForCoordinates`, `isCoordinateInRegion`, `pickRandomCraving`), emoji deduction (`deduceHeroEmoji`), pin categorization (`getCrumbPinType`), search and quick filters.
- **API Workspace Automated Tests & Typecheck (`bun run check && bun test src`)**:
  - **62 tests passed across 9 test suites** (99 assertions, 0 failures).

---

## 5. Summary Verdict

The **Live Cravings Map** implementation is fully compliant with all architectural invariants, design tokens, terminology standards, and functional specifications.

**Verdict**: **APPROVED (100% PASS)**

Bob's your uncle.
