import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  type MapCoordinates,
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
    selectedGuideId,
    setSelectedGuideId,
    quickFilters,
    toggleQuickFilter,
    guides,
    refetch: refetchMapCrumbs,
  } = useMapCrumbs();

  const params = useLocalSearchParams<{
    guideId?: string;
    crumbId?: string;
    t?: string;
  }>();
  const guideId = params.guideId;
  const crumbId = params.crumbId;
  const navTimestamp = params.t;

  const selectedCrumb = useMemo(() => {
    if (!selectedCrumbId) return null;
    return allSavedCrumbs.find((c) => c.id === selectedCrumbId) || null;
  }, [selectedCrumbId, allSavedCrumbs]);

  // Smooth camera animator with vertical offset so bottom sheet doesn't cover pin
  const animateCameraToCrumb = useCallback((crumb: EnrichedUserCrumb) => {
    if (
      !mapRef.current ||
      !Number.isFinite(crumb.restaurant?.latitude) ||
      !Number.isFinite(crumb.restaurant?.longitude)
    ) {
      return;
    }

    const lat = Number(crumb.restaurant.latitude);
    const lng = Number(crumb.restaurant.longitude);
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

  // Helper to zoom to a guide's neighborhood
  const zoomToGuideArea = useCallback(
    (targetGuideId: string, crumbsList: EnrichedUserCrumb[]) => {
      const guideCrumbs = crumbsList.filter((c) => {
        if (targetGuideId === 'uncategorized') {
          const hasGuideIds = c.guideIds && c.guideIds.length > 0;
          const hasGuides = c.guides && c.guides.length > 0;
          return !hasGuideIds && !hasGuides;
        }
        return Boolean(
          (c.guideIds && c.guideIds.includes(targetGuideId)) ||
          (c.guides && c.guides.some((g) => g.id === targetGuideId)),
        );
      });

      if (guideCrumbs.length === 0) return false;

      const validCoords: MapCoordinates[] = guideCrumbs
        .filter(
          (c) =>
            c.restaurant &&
            Number.isFinite(c.restaurant.latitude) &&
            Number.isFinite(c.restaurant.longitude) &&
            Number(c.restaurant.latitude) !== 0 &&
            Number(c.restaurant.longitude) !== 0,
        )
        .map((c) => ({
          latitude: Number(c.restaurant.latitude),
          longitude: Number(c.restaurant.longitude),
        }));

      if (validCoords.length === 0) return false;

      const firstCoord = validCoords[0]!;
      const targetRegion: MapRegion = {
        latitude: firstCoord.latitude,
        longitude: firstCoord.longitude,
        latitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.latitudeDelta,
        longitudeDelta: USER_NEIGHBORHOOD_ZOOM_DELTA.longitudeDelta,
      };

      if (mapRef.current) {
        isProgrammaticMoveRef.current = true;
        mapRef.current.animateToRegion(targetRegion, 600);
        setCurrentRegion(targetRegion);
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 700);
        return true;
      }
      return false;
    },
    [],
  );

  const lastHandledNavKeyRef = useRef<string | null>(null);

  // Refetch map crumbs and guides on tab focus; focus on crumb or guide if navigated
  useFocusEffect(
    useCallback(() => {
      refetchMapCrumbs();

      if (crumbId) {
        const navKey = `crumb-${crumbId}-${navTimestamp || ''}`;
        if (navKey !== lastHandledNavKeyRef.current) {
          lastHandledNavKeyRef.current = navKey;
          hasCenteredInitialLocationRef.current = true;
          setSelectedCrumbId(crumbId);

          const targetCrumb = allSavedCrumbs.find((c) => c.id === crumbId);
          if (targetCrumb) {
            const t1 = setTimeout(() => {
              animateCameraToCrumb(targetCrumb);
            }, 150);
            const t2 = setTimeout(() => {
              animateCameraToCrumb(targetCrumb);
            }, 450);

            return () => {
              clearTimeout(t1);
              clearTimeout(t2);
            };
          }
        }
      } else if (guideId) {
        const navKey = `guide-${guideId}-${navTimestamp || ''}`;
        if (navKey !== lastHandledNavKeyRef.current) {
          lastHandledNavKeyRef.current = navKey;
          hasCenteredInitialLocationRef.current = true;
          setSelectedGuideId(guideId);
          setSelectedCrumbId(null);

          // Staggered timers ensure native screen transition completes before calling animateToRegion
          const t1 = setTimeout(() => {
            zoomToGuideArea(guideId, allSavedCrumbs);
          }, 150);
          const t2 = setTimeout(() => {
            zoomToGuideArea(guideId, allSavedCrumbs);
          }, 450);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      }
    }, [
      refetchMapCrumbs,
      crumbId,
      guideId,
      navTimestamp,
      allSavedCrumbs,
      setSelectedGuideId,
      zoomToGuideArea,
      animateCameraToCrumb,
    ]),
  );

  // Initial camera sync when user location resolves (only if not navigating directly to a guide or crumb)
  const hasCenteredInitialLocationRef = useRef(false);
  useEffect(() => {
    if (
      userCoords &&
      !hasCenteredInitialLocationRef.current &&
      !guideId &&
      !crumbId &&
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
  }, [userCoords, guideId, crumbId]);

  // If crumbs finish loading after navigation occurred, trigger the zoom/selection
  useEffect(() => {
    if (crumbId && allSavedCrumbs.length > 0) {
      const navKey = `crumb-${crumbId}-${navTimestamp || ''}`;
      if (lastHandledNavKeyRef.current === navKey) {
        const targetCrumb = allSavedCrumbs.find((c) => c.id === crumbId);
        if (targetCrumb) {
          setSelectedCrumbId(crumbId);
          animateCameraToCrumb(targetCrumb);
        }
      }
    } else if (guideId && allSavedCrumbs.length > 0) {
      const navKey = `guide-${guideId}-${navTimestamp || ''}`;
      if (lastHandledNavKeyRef.current === navKey) {
        zoomToGuideArea(guideId, allSavedCrumbs);
      }
    }
  }, [
    crumbId,
    guideId,
    navTimestamp,
    allSavedCrumbs,
    zoomToGuideArea,
    animateCameraToCrumb,
  ]);

  const handleSelectGuide = useCallback(
    (newGuideId: string | null) => {
      setSelectedGuideId(newGuideId);
      if (newGuideId && newGuideId !== 'uncategorized') {
        zoomToGuideArea(newGuideId, allSavedCrumbs);
      }
    },
    [allSavedCrumbs, setSelectedGuideId, zoomToGuideArea],
  );

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
        selectedGuideId={selectedGuideId}
        guides={guides}
        onSelectGuide={handleSelectGuide}
        activeQuickFilters={quickFilters}
        onToggleQuickFilter={toggleQuickFilter}
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
