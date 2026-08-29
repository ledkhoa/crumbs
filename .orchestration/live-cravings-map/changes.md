# Live Cravings Map (Home Tab) - Implementation Summary

## 1. Overview
Implemented the **Live Cravings Map** on the mobile Home tab (`mobile/src/app/(tabs)/(home)/index.tsx`), turning the home screen into an interactive, visual, and geographic discovery canvas powered by `react-native-maps` and `expo-location`.

## 2. Key Changes & Additions

### Native Platform & Dependencies
- **`mobile/package.json`**: Installed `react-native-maps@1.29.0` and `expo-location@57.0.14`.
- **`mobile/app.json`**: Configured iOS `NSLocationWhenInUseUsageDescription`, Android permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`), and the `expo-location` config plugin.

### Types & Theming
- **`mobile/src/types/map.ts`**: Defined `MapCoordinates`, `MapRegion`, `BoundingBox`, `LocationPermissionStatus`, `UserLocationState`, `MapQuickFilter`, `MapFilterState`, `CrumbPinData`, `DEFAULT_NYC_COORDINATES`, and `USER_NEIGHBORHOOD_ZOOM_DELTA`.
- **`mobile/src/utils/map-theme.ts`**: Added `MAP_LIGHT_STYLE` and `MAP_DARK_STYLE` custom JSON themes conforming to Crumbs Warm Editorial palette (Warm Buttercream `#F7F4EF`, Deep Espresso `#141210`, Sage `#DCE8D6`, Muted Blue-Grey `#D6E4E5`).

### Spatial Math & Geolocation Hooks
- **`mobile/src/utils/map-clustering.ts` & `mobile/src/utils/map-clustering.test.ts`**:
  - `haversineDistanceMiles`: Accurate lat/lng distance calculation in miles.
  - `getBoundingRegionForCoordinates`: Dynamic bounding box calculation with padding.
  - `isCoordinateInRegion`: Fast viewport containment checking.
  - `pickRandomCraving`: Viewport-aware random selection for "Decide Now".
- **`mobile/src/utils/map-filter.ts` & `mobile/src/hooks/useMapCrumbs.test.ts`**:
  - `deduceHeroEmoji`: Cuisine and hero dish keyword analysis to food emoji mapping (🍝, 🍕, 🥐, ☕, 🍣, 🍸, 🍔, 🌮, 🍦, 🍜, 🥩, 🦪, 🍴).
  - `getCrumbPinType`: Maps crumb status/visited state to pin badge types (`saved`, `visited`, `inbox`).
  - `filterCrumbs`: Filtering across search query, guide ID, and quick filters (`open_now`, `bookable`, `unorganized`, `visited`).
- **`mobile/src/hooks/useUserLocation.ts`**:
  - Manages `expo-location` foreground permissions with 3000ms timeout race protection.
  - Smoothly falls back to Lower Manhattan/West Village NYC coordinates (`40.7282, -73.9942`) on denial/timeout.
  - Provides `recenterToUser`, `requestPermission`, and `openAppSettings`.
- **`mobile/src/hooks/useMapCrumbs.ts`**:
  - Integrates `useCrumbsQuery()` and `useGuidesQuery()` with coordinate validation and stateful filtering.

### Living Map Components
- **`mobile/src/components/map/LiveCravingsMapView.tsx`**: Custom MapView canvas applying light/dark styles and rendering user crumb markers.
- **`mobile/src/components/map/CrumbMapMarker.tsx`**: Custom marker pin displaying food emoji, restaurant name, terracotta/sage/gold badge, scaling spring animation (1.22x), and rating metadata when selected.
- **`mobile/src/components/map/MapCrumbCarousel.tsx`**: Snapping horizontal `FlatList` wrapping `CompactCrumbCard` with bidirectional selection synchronization.
- **`mobile/src/components/map/MapFilterBar.tsx`**: Floating glass search bar with guide dropdown modal and quick filter chips (`All`, `Open Now`, `Bookable`, `Unorganized`, `Visited`).
- **`mobile/src/components/map/MapFloatingControls.tsx`**: Floating action island with `MyLocationButton` and `DecideNowButton` triggering rolling haptic sequence.
- **`mobile/src/components/map/LocationPermissionBanner.tsx`**: Non-blocking permission recovery banner with 1-tap recovery.
- **`mobile/src/components/map/MapEmptyStateOverlay.tsx`**: Editorial guidance overlays for brand new users and empty viewports with "View All Saved" camera zooming.

### Home Tab Integration
- **`mobile/src/app/(tabs)/(home)/index.tsx`**:
  - Assembled all Living Map layers with safe area insets.
  - Bidirectional Marker $\leftrightarrow$ Carousel sync with vertical camera offset formula ($targetLat = lat - latDelta \times 0.15$) so cards don't obscure pins.
  - "Decide Now" randomized selection animation with multi-tap haptics.
  - Integrated `QuickAddToGuideModal` and native directions/reservation deep-linking.

### API Types Compatibility
- **`api/src/modules/crumbs/crumbs.types.ts` & `api/src/modules/crumbs/crumbs.repository.ts`**:
  - Ensured `neighborhood` and `regularOpeningHours` fields are included in `EnrichedUserCrumb['restaurant']` payload.

## 3. Verification
- `bun run check` passed across both `api` and `mobile` workspaces with zero errors and zero warnings.
- `bun test src` passed across all 64 unit and integration tests.
