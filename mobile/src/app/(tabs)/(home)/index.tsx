import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Linking, type FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type MapView from 'react-native-maps';
import { useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { openDefaultMaps } from '@/utils/maps';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useMapCrumbs } from '@/hooks/useMapCrumbs';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import {
  DEFAULT_NYC_COORDINATES,
  USER_NEIGHBORHOOD_ZOOM_DELTA,
  type MapRegion,
} from '@/types/map';
import {
  getBoundingRegionForCoordinates,
  pickRandomCraving,
  isCoordinateInRegion,
} from '@/utils/map-clustering';
import { LiveCravingsMapView } from '@/components/map/LiveCravingsMapView';
import { MapFilterBar } from '@/components/map/MapFilterBar';
import { MapCrumbCarousel } from '@/components/map/MapCrumbCarousel';
import { MapFloatingControls } from '@/components/map/MapFloatingControls';
import { LocationPermissionBanner } from '@/components/map/LocationPermissionBanner';
import { MapEmptyStateOverlay } from '@/components/map/MapEmptyStateOverlay';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<EnrichedUserCrumb> | null>(null);
  const isProgrammaticMoveRef = useRef(false);

  const [selectedCrumbId, setSelectedCrumbId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(
    DEFAULT_NYC_COORDINATES,
  );
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [guideModalTarget, setGuideModalTarget] =
    useState<EnrichedUserCrumb | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const addCrumbMutation = useAddCrumbToGuideMutation();

  const {
    coords: userCoords,
    status: locationStatus,
    requestPermission,
    recenterToUser,
  } = useUserLocation();

  const {
    allSavedCrumbs,
    filteredCrumbs,
    searchQuery,
    setSearchQuery,
    selectedGuideId,
    setSelectedGuideId,
    quickFilter,
    setQuickFilter,
    guides,
  } = useMapCrumbs();

  // Initial camera sync when user location resolves
  const hasCenteredInitialLocationRef = useRef(false);
  useEffect(() => {
    if (
      userCoords &&
      !hasCenteredInitialLocationRef.current &&
      mapRef.current
    ) {
      hasCenteredInitialLocationRef.current = true;
      const targetRegion: MapRegion = {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.latitudeDelta,
        longitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.longitudeDelta,
      };
      mapRef.current.animateToRegion(targetRegion, 800);
      setCurrentRegion(targetRegion);
    }
  }, [userCoords]);

  // Determine which crumbs are within the current map viewport
  const crumbsInViewport = useMemo(() => {
    return filteredCrumbs.filter((crumb) => {
      if (
        !Number.isFinite(crumb.restaurant?.latitude) ||
        !Number.isFinite(crumb.restaurant?.longitude)
      ) {
        return false;
      }
      return isCoordinateInRegion(
        {
          latitude: crumb.restaurant.latitude!,
          longitude: crumb.restaurant.longitude!,
        },
        currentRegion,
      );
    });
  }, [filteredCrumbs, currentRegion]);

  // Smooth camera animator with vertical offset so bottom carousel doesn't cover pin
  const animateCameraToCrumb = useCallback((crumb: EnrichedUserCrumb) => {
    if (
      !mapRef.current ||
      !Number.isFinite(crumb.restaurant?.latitude) ||
      !Number.isFinite(crumb.restaurant?.longitude)
    ) {
      return;
    }

    const lat = crumb.restaurant.latitude!;
    const lng = crumb.restaurant.longitude!;
    const latDelta = USER_NEIGHBORHOOD_ZOOM_DELTA.latitudeDelta;
    const lngDelta = USER_NEIGHBORHOOD_ZOOM_DELTA.longitudeDelta;
    const targetLat = lat - latDelta * 0.15; // Shift pin into upper visible viewport

    isProgrammaticMoveRef.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: targetLat,
        longitude: lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      },
      500,
    );

    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 600);
  }, []);

  const handleMarkerSelect = useCallback(
    (crumbId: string) => {
      setSelectedCrumbId(crumbId);
      const targetCrumb = filteredCrumbs.find((c) => c.id === crumbId);
      if (targetCrumb) {
        animateCameraToCrumb(targetCrumb);
      }
    },
    [filteredCrumbs, animateCameraToCrumb],
  );

  const handleCarouselSelect = useCallback(
    (crumb: EnrichedUserCrumb) => {
      setSelectedCrumbId(crumb.id);
      animateCameraToCrumb(crumb);
    },
    [animateCameraToCrumb],
  );

  const handleCardPress = (crumb: EnrichedUserCrumb) => {
    haptics.tap();
    router.push({
      pathname: '/crumbs/[id]',
      params: { id: crumb.id },
    });
  };

  const handleAddToGuide = (crumb: EnrichedUserCrumb) => {
    setGuideModalTarget(crumb);
  };

  const handleGuideSelected = async (guideId: string) => {
    if (guideModalTarget) {
      try {
        await addCrumbMutation.mutateAsync({
          guideId,
          crumbIds: [guideModalTarget.id],
        });
      } catch (err) {
        console.error('[LivingMap] Failed to add crumb to guide:', err);
      } finally {
        setGuideModalTarget(null);
      }
    }
  };

  const handleBookOrMapPress = (crumb: EnrichedUserCrumb) => {
    const { restaurant } = crumb;
    if (restaurant.reservationUrl) {
      haptics.tap();
      Linking.openURL(restaurant.reservationUrl).catch((err) =>
        console.warn('[LivingMap] Could not open reservation link:', err),
      );
    } else {
      openDefaultMaps({
        name: restaurant.name,
        address: restaurant.formattedAddress || undefined,
        latitude: restaurant.latitude ? Number(restaurant.latitude) : undefined,
        longitude: restaurant.longitude
          ? Number(restaurant.longitude)
          : undefined,
      });
    }
  };

  const handleRecenterPress = async () => {
    setIsLocating(true);
    try {
      const coords = await recenterToUser();
      if (coords && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.latitudeDelta,
            longitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.longitudeDelta,
          },
          600,
        );
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleDecideNowPress = () => {
    // 3 rapid light taps followed by success impact
    haptics.tap();
    setTimeout(() => haptics.tap(), 80);
    setTimeout(() => haptics.tap(), 160);
    setTimeout(() => haptics.success(), 260);

    const pool = filteredCrumbs.length > 0 ? filteredCrumbs : allSavedCrumbs;
    const winningCrumb = pickRandomCraving(pool, currentRegion);

    if (winningCrumb) {
      setSelectedCrumbId(winningCrumb.id);
      animateCameraToCrumb(winningCrumb);
    }
  };

  const handleFitAllCrumbs = () => {
    const coords = allSavedCrumbs
      .map((c) => {
        if (
          Number.isFinite(c.restaurant?.latitude) &&
          Number.isFinite(c.restaurant?.longitude)
        ) {
          return {
            latitude: c.restaurant.latitude!,
            longitude: c.restaurant.longitude!,
          };
        }
        return null;
      })
      .filter((c): c is { latitude: number; longitude: number } => c !== null);

    if (coords.length > 0 && mapRef.current) {
      const bounding = getBoundingRegionForCoordinates(coords);
      mapRef.current.animateToRegion(bounding, 700);
    }
  };

  const isGlobalEmpty = allSavedCrumbs.length === 0;
  const isViewportEmpty =
    !isGlobalEmpty &&
    filteredCrumbs.length > 0 &&
    crumbsInViewport.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Layer 0 & 1: Fullscreen Map & Custom Pins */}
      <LiveCravingsMapView
        mapRef={mapRef}
        crumbs={filteredCrumbs}
        selectedCrumbId={selectedCrumbId}
        onSelectCrumb={handleMarkerSelect}
        onRegionChangeComplete={setCurrentRegion}
        initialRegion={DEFAULT_NYC_COORDINATES}
        showsUserLocation={locationStatus === 'granted'}
      />

      {/* Layer 2: Floating Glass Top Header */}
      <View style={[styles.topHeaderContainer, { top: insets.top + 8 }]}>
        <MapFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGuideId={selectedGuideId}
          guides={guides}
          onSelectGuide={setSelectedGuideId}
          activeQuickFilter={quickFilter}
          onSelectQuickFilter={setQuickFilter}
          totalVisibleCount={filteredCrumbs.length}
        />

        {/* Non-blocking Permission Banner */}
        {!isBannerDismissed && (
          <LocationPermissionBanner
            status={locationStatus}
            onRequestPermission={requestPermission}
            onDismiss={() => setIsBannerDismissed(true)}
          />
        )}
      </View>

      {/* Empty States (Global or Viewport) */}
      {isGlobalEmpty ? (
        <MapEmptyStateOverlay
          type="no_saved_crumbs_global"
          onAddCrumb={() => router.push('/(tabs)/inbox')}
        />
      ) : isViewportEmpty ? (
        <MapEmptyStateOverlay
          type="no_crumbs_in_viewport"
          totalSavedCount={allSavedCrumbs.length}
          onFitAllCrumbs={handleFitAllCrumbs}
          topOffset={
            insets.top +
            (!isBannerDismissed && locationStatus !== 'granted' ? 148 : 98)
          }
        />
      ) : null}

      {/* Layer 3: Floating Action Controls (MyLocation & Decide Now Grouped on Bottom Right) */}
      <MapFloatingControls
        onRecenterPress={handleRecenterPress}
        onDecideNowPress={handleDecideNowPress}
        isLocating={isLocating}
        bottomOffset={insets.bottom + 160}
      />

      {/* Layer 4: Bottom Snapping Crumb Card Carousel */}
      <View
        style={[styles.bottomCarouselWrapper, { bottom: insets.bottom + 8 }]}
      >
        <MapCrumbCarousel
          carouselRef={carouselRef}
          crumbs={filteredCrumbs}
          selectedCrumbId={selectedCrumbId}
          onSelectCrumb={handleCarouselSelect}
          onCrumbCardPress={handleCardPress}
          onAddToGuidePress={handleAddToGuide}
          onBookOrMapPress={handleBookOrMapPress}
        />
      </View>

      {/* Quick Add To Guide Modal */}
      {guideModalTarget && (
        <QuickAddToGuideModal
          visible={Boolean(guideModalTarget)}
          restaurantName={guideModalTarget.restaurant.name}
          crumbId={guideModalTarget.id}
          onClose={() => setGuideModalTarget(null)}
          onGuideSelected={handleGuideSelected}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bottomCarouselWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
  },
});
