import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
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
import { pickRandomCraving } from '@/utils/map-clustering';
import { LiveCravingsMapView } from '@/components/map/LiveCravingsMapView';
import { LivingMapBottomSheet } from '@/components/map/LivingMapBottomSheet';
import { IngestionOverlaySheet } from '@/components/ingestion/IngestionOverlaySheet';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const mapRef = useRef<MapView | null>(null);
  const isProgrammaticMoveRef = useRef(false);

  const [selectedCrumbId, setSelectedCrumbId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(
    DEFAULT_NYC_COORDINATES,
  );
  const [guideModalTarget, setGuideModalTarget] =
    useState<EnrichedUserCrumb | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [ingestOverlayState, setIngestOverlayState] = useState<{
    visible: boolean;
    sourceUrl: string;
  }>({
    visible: false,
    sourceUrl: '',
  });

  const addCrumbMutation = useAddCrumbToGuideMutation();

  const {
    coords: userCoords,
    status: locationStatus,
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

  const selectedCrumb = useMemo(() => {
    if (!selectedCrumbId) return null;
    return allSavedCrumbs.find((c) => c.id === selectedCrumbId) || null;
  }, [selectedCrumbId, allSavedCrumbs]);

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

  // Smooth camera animator with vertical offset so bottom sheet doesn't cover pin
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
    const targetLat = lat - latDelta * 0.18; // Shift pin into upper half of visible viewport

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
      const targetCrumb = allSavedCrumbs.find((c) => c.id === crumbId);
      if (targetCrumb) {
        animateCameraToCrumb(targetCrumb);
      }
    },
    [allSavedCrumbs, animateCameraToCrumb],
  );

  const handleSheetSelectCrumb = useCallback(
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Layer 0 & 1: Full-Bleed Map & Custom Pins */}
      <LiveCravingsMapView
        mapRef={mapRef}
        crumbs={filteredCrumbs}
        selectedCrumbId={selectedCrumbId}
        onSelectCrumb={handleMarkerSelect}
        onRegionChangeComplete={setCurrentRegion}
        initialRegion={DEFAULT_NYC_COORDINATES}
        showsUserLocation={locationStatus === 'granted'}
      />

      {/* Layer 2: Frosted Bottom Sheet Drawer (Mock 5.6 Sol Layout) */}
      <LivingMapBottomSheet
        crumbs={filteredCrumbs}
        allSavedCrumbs={allSavedCrumbs}
        selectedCrumb={selectedCrumb}
        onDeselectCrumb={() => setSelectedCrumbId(null)}
        onSelectCrumb={handleSheetSelectCrumb}
        onCardPress={handleCardPress}
        onAddToGuidePress={handleAddToGuide}
        onBookOrMapPress={handleBookOrMapPress}
        onIngestUrl={(url) =>
          setIngestOverlayState({ visible: true, sourceUrl: url })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGuideId={selectedGuideId}
        guides={guides}
        onSelectGuide={setSelectedGuideId}
        activeQuickFilter={quickFilter}
        onSelectQuickFilter={setQuickFilter}
        onRecenterPress={handleRecenterPress}
        onDecideNowPress={handleDecideNowPress}
        isLocating={isLocating}
        userCoords={userCoords}
        locationStatus={locationStatus}
        bottomInset={0}
      />

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

      {/* Ingestion Extraction Overlay (when link pasted in fresh map sheet) */}
      {ingestOverlayState.visible && (
        <IngestionOverlaySheet
          visible={ingestOverlayState.visible}
          sourceUrl={ingestOverlayState.sourceUrl}
          onClose={() =>
            setIngestOverlayState({ visible: false, sourceUrl: '' })
          }
          onNavigateToInbox={() => {
            setIngestOverlayState({ visible: false, sourceUrl: '' });
            router.push('/(tabs)/inbox');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
