import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { GrabHandle } from '@/components/ui/GrabHandle';
import { SearchInput } from '@/components/ui/SearchInput';
import { MapCrumbDetailCard } from '@/components/map/MapCrumbDetailCard';
import {
  SparkleIcon,
  NavigationArrowIcon,
  CaretRightIcon,
} from 'phosphor-react-native';
import { haversineDistanceMiles } from '@/utils/map-clustering';
import { getRestaurantOpenStatus } from '@/utils/opening-hours';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import type {
  MapCoordinates,
  MapQuickFilter,
  LocationPermissionStatus,
} from '@/types/map';
import type { GuideSummary } from '@/hooks/useMapCrumbs';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const PEEK_HEIGHT = 200;
export const MID_HEIGHT = Math.round(SCREEN_HEIGHT * 0.48);
export const FULL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.84);

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 220,
  mass: 0.8,
};

export interface LivingMapBottomSheetProps {
  crumbs: EnrichedUserCrumb[];
  allSavedCrumbs: EnrichedUserCrumb[];
  selectedCrumb: EnrichedUserCrumb | null;
  onDeselectCrumb: () => void;
  onSelectCrumb: (crumb: EnrichedUserCrumb) => void;
  onCardPress: (crumb: EnrichedUserCrumb) => void;
  onAddToGuidePress: (crumb: EnrichedUserCrumb) => void;
  onBookOrMapPress: (crumb: EnrichedUserCrumb) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGuideId: string | null;
  guides: GuideSummary[];
  onSelectGuide: (guideId: string | null) => void;
  activeQuickFilter: MapQuickFilter;
  onSelectQuickFilter: (filter: MapQuickFilter) => void;
  onRecenterPress: () => void;
  onDecideNowPress: () => void;
  isLocating?: boolean;
  userCoords: MapCoordinates | null;
  locationStatus: LocationPermissionStatus;
  bottomInset?: number;
}

const FILTER_CHIPS: Array<{ key: MapQuickFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'open_now', label: 'Open Now 🟢' },
  { key: 'bookable', label: 'Bookable 🍷' },
  { key: 'unorganized', label: 'Unorganized ✨' },
  { key: 'visited', label: 'Visited ✓' },
];

export function LivingMapBottomSheet({
  crumbs,
  allSavedCrumbs,
  selectedCrumb,
  onDeselectCrumb,
  onSelectCrumb,
  onCardPress,
  onAddToGuidePress,
  onBookOrMapPress,
  searchQuery,
  onSearchChange,
  selectedGuideId,
  guides,
  onSelectGuide,
  activeQuickFilter,
  onSelectQuickFilter,
  onRecenterPress,
  onDecideNowPress,
  isLocating = false,
  userCoords,
  bottomInset = 0,
}: LivingMapBottomSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();

  // Reanimated Sheet Height State - Defaults to PEEK (Map-first hero)
  const sheetHeight = useSharedValue(PEEK_HEIGHT);
  const startHeight = useSharedValue(PEEK_HEIGHT);
  const [currentDetent, setCurrentDetent] = useState<'peek' | 'mid' | 'full'>(
    'peek',
  );

  // 1. Inbox Crumbs (Unorganized or status === 'inbox')
  const inboxCrumbs = useMemo(() => {
    return allSavedCrumbs.filter(
      (c) => c.status === 'inbox' || !c.guideIds || c.guideIds.length === 0,
    );
  }, [allSavedCrumbs]);

  // 2. Open Now & Nearby Crumbs (Sorted by proximity to user)
  const openAndNearbyCrumbs = useMemo(() => {
    return allSavedCrumbs
      .map((c) => {
        const openStatus = getRestaurantOpenStatus(
          c.restaurant.regularOpeningHours,
        );
        let distanceMiles: number | null = null;
        if (
          userCoords &&
          Number.isFinite(c.restaurant.latitude) &&
          Number.isFinite(c.restaurant.longitude)
        ) {
          distanceMiles = haversineDistanceMiles(
            userCoords.latitude,
            userCoords.longitude,
            c.restaurant.latitude!,
            c.restaurant.longitude!,
          );
        }
        return {
          crumb: c,
          isOpen: openStatus.isOpen,
          distanceMiles,
        };
      })
      .filter((item) => item.isOpen)
      .sort((a, b) => {
        if (a.distanceMiles !== null && b.distanceMiles !== null) {
          return a.distanceMiles - b.distanceMiles;
        }
        return 0;
      });
  }, [allSavedCrumbs, userCoords]);

  const triggerSnapHaptic = () => {
    haptics.primary();
  };

  // Gesture Handling for Smooth Snapping
  const snapTo = (detent: 'peek' | 'mid' | 'full') => {
    'worklet';
    let target = PEEK_HEIGHT;
    if (detent === 'peek') target = PEEK_HEIGHT;
    if (detent === 'mid') target = MID_HEIGHT;
    if (detent === 'full') target = FULL_HEIGHT;

    sheetHeight.value = withSpring(target, SPRING_CONFIG);
    scheduleOnRN(setCurrentDetent, detent);
    scheduleOnRN(triggerSnapHaptic);
  };

  const SNAP_MAGNETIC_RADIUS = 32;
  const activeSnapZone = useSharedValue<'none' | 'peek' | 'mid' | 'full'>(
    'none',
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startHeight.value = sheetHeight.value;
      activeSnapZone.value = 'none';
    })
    .onUpdate((event) => {
      'worklet';
      const newHeight = startHeight.value - event.translationY;
      // Freeform drag clamped with gentle overscroll elasticity
      if (newHeight >= PEEK_HEIGHT - 25 && newHeight <= FULL_HEIGHT + 35) {
        sheetHeight.value = newHeight;
      }

      // Real-time magnetic notch crossing detection while dragging
      let currentZone: 'none' | 'peek' | 'mid' | 'full' = 'none';
      if (Math.abs(newHeight - PEEK_HEIGHT) <= SNAP_MAGNETIC_RADIUS) {
        currentZone = 'peek';
      } else if (Math.abs(newHeight - MID_HEIGHT) <= SNAP_MAGNETIC_RADIUS) {
        currentZone = 'mid';
      } else if (Math.abs(newHeight - FULL_HEIGHT) <= SNAP_MAGNETIC_RADIUS) {
        currentZone = 'full';
      }

      if (currentZone !== 'none' && currentZone !== activeSnapZone.value) {
        activeSnapZone.value = currentZone;
        scheduleOnRN(triggerSnapHaptic);
      } else if (currentZone === 'none' && activeSnapZone.value !== 'none') {
        activeSnapZone.value = 'none';
      }
    })
    .onEnd((event) => {
      'worklet';
      activeSnapZone.value = 'none';
      const current = sheetHeight.value;
      const velocity = -event.velocityY;

      // High velocity swipes fling directly to the corresponding anchor marker
      if (velocity > 650) {
        if (current < MID_HEIGHT) {
          snapTo('mid');
        } else {
          snapTo('full');
        }
        return;
      }
      if (velocity < -650) {
        if (current > MID_HEIGHT) {
          snapTo('mid');
        } else {
          snapTo('peek');
        }
        return;
      }

      // Check if within magnetic snap zone of any of the 3 marker anchors
      const distPeek = Math.abs(current - PEEK_HEIGHT);
      const distMid = Math.abs(current - MID_HEIGHT);
      const distFull = Math.abs(current - FULL_HEIGHT);

      if (distPeek <= SNAP_MAGNETIC_RADIUS) {
        snapTo('peek');
      } else if (distMid <= SNAP_MAGNETIC_RADIUS) {
        snapTo('mid');
      } else if (distFull <= SNAP_MAGNETIC_RADIUS) {
        snapTo('full');
      } else {
        // Freeform custom position: smoothly settle at exact custom height
        const clampedHeight = Math.max(
          PEEK_HEIGHT,
          Math.min(FULL_HEIGHT, current),
        );
        sheetHeight.value = withSpring(clampedHeight, SPRING_CONFIG);
        if (clampedHeight > MID_HEIGHT + 40) {
          scheduleOnRN(setCurrentDetent, 'full');
        } else if (clampedHeight > PEEK_HEIGHT + 40) {
          scheduleOnRN(setCurrentDetent, 'mid');
        } else {
          scheduleOnRN(setCurrentDetent, 'peek');
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const handleSearchFocus = () => {
    if (currentDetent === 'peek') {
      snapTo('mid');
    }
  };

  const handleChipPress = (filter: MapQuickFilter) => {
    haptics.tap();
    onSelectQuickFilter(filter);
    if (currentDetent === 'peek') {
      snapTo('mid');
    }
  };

  const formatDistance = (miles: number | null) => {
    if (miles === null) return '';
    if (miles < 0.1) return '· nearby';
    if (miles < 1) return `· ${(miles * 5280).toFixed(0)} ft`;
    return `· ${miles.toFixed(1)} mi`;
  };

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          shadowColor: colors.shadow,
          bottom: bottomInset,
        },
        animatedStyle,
      ]}
    >
      {/* Pan Gesture Header (Grab Handle & Quick Search Row) */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHeader}>
          <GrabHandle style={styles.grabHandle} />

          {/* If NO pin is selected, show Search Input & Action Buttons in Thumb Zone */}
          {!selectedCrumb && (
            <>
              <View style={styles.searchBarRow}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="Search cravings, dishes, vibes..."
                  onFocus={handleSearchFocus}
                  containerStyle={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                />

                {/* Decide Now Action Button */}
                <TouchableOpacity
                  style={[
                    styles.iconActionButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    haptics.primary();
                    onDecideNowPress();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Decide a craving for me"
                >
                  <SparkleIcon
                    size={18}
                    color={colors.onPrimary}
                    weight="fill"
                  />
                </TouchableOpacity>

                {/* My Location Button */}
                <TouchableOpacity
                  style={[
                    styles.iconActionButton,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    onRecenterPress();
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Recenter to my location"
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <NavigationArrowIcon
                      size={18}
                      color={colors.primary}
                      weight="fill"
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Filter Chips Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContainer}
              >
                {FILTER_CHIPS.map((chip) => {
                  const isActive = activeQuickFilter === chip.key;
                  const label =
                    chip.key === 'all' ? `All (${crumbs.length})` : chip.label;

                  return (
                    <TouchableOpacity
                      key={chip.key}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.inputBackground,
                          borderColor: isActive
                            ? colors.primary
                            : colors.inputBorder,
                        },
                      ]}
                      onPress={() => handleChipPress(chip.key)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={label}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isActive ? colors.onPrimary : colors.text,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </GestureDetector>

      {/* Sheet Body: Selected Crumb Detail Card OR Discovery Sections */}
      {selectedCrumb ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.selectedCardScroll}
          nestedScrollEnabled
        >
          <MapCrumbDetailCard
            crumb={selectedCrumb}
            onPress={onCardPress}
            onAddToGuide={onAddToGuidePress}
            onBookOrMapPress={onBookOrMapPress}
            onClose={onDeselectCrumb}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
        >
          {/* SECTION 1: Recent Inbox */}
          {inboxCrumbs.length > 0 && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => router.push('/(tabs)/inbox')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                    },
                  ]}
                >
                  Recent inbox
                </Text>

                <View style={styles.badgeArrowRow}>
                  <View
                    style={[
                      styles.inboxCountBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.inboxCountText}>
                      {inboxCrumbs.length}
                    </Text>
                  </View>
                  <CaretRightIcon size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              {/* Inbox Photo Cards Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.inboxCardsContainer}
              >
                {inboxCrumbs.slice(0, 8).map((crumb) => {
                  const imageUrl =
                    crumb.restaurant.photoUrl ||
                    crumb.sourcePost?.mediaUrls?.[0];

                  return (
                    <TouchableOpacity
                      key={crumb.id}
                      style={[
                        styles.inboxCard,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        haptics.tap();
                        onSelectCrumb(crumb);
                      }}
                      activeOpacity={0.85}
                    >
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.inboxCardImage}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={styles.inboxCardPlaceholder}>
                          <Text style={styles.inboxCardEmoji}>🍴</Text>
                        </View>
                      )}

                      {/* Gradient Overlay & Name */}
                      <View style={styles.inboxCardOverlay}>
                        <Text style={styles.inboxCardName} numberOfLines={1}>
                          {crumb.restaurant.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* SECTION 2: My Guides */}
          {guides.length > 0 && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => router.push('/(tabs)/guides')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                    },
                  ]}
                >
                  My guides
                </Text>
                <CaretRightIcon size={14} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.guidesList}>
                {guides.slice(0, 4).map((guide) => (
                  <TouchableOpacity
                    key={guide.id}
                    style={[
                      styles.guideRow,
                      {
                        borderBottomColor: colors.cardBorder,
                        backgroundColor:
                          selectedGuideId === guide.id
                            ? colors.inputBackground
                            : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptics.tap();
                      if (selectedGuideId === guide.id) {
                        onSelectGuide(null);
                      } else {
                        onSelectGuide(guide.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.guideRowLeft}>
                      <Text style={styles.guideRowEmoji}>
                        {guide.emojiIcon || '📑'}
                      </Text>
                      <Text
                        style={[styles.guideRowName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {guide.name}
                      </Text>
                    </View>
                    <CaretRightIcon size={14} color={colors.textSubtle} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* SECTION 3: Open Now & Nearby */}
          {openAndNearbyCrumbs.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                    },
                  ]}
                >
                  Open now & nearby
                </Text>
              </View>

              <View style={styles.nearbyList}>
                {openAndNearbyCrumbs
                  .slice(0, 5)
                  .map(({ crumb, distanceMiles }) => (
                    <TouchableOpacity
                      key={crumb.id}
                      style={[
                        styles.nearbyRow,
                        { borderBottomColor: colors.cardBorder },
                      ]}
                      onPress={() => {
                        haptics.tap();
                        onSelectCrumb(crumb);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.nearbyRowLeft}>
                        <View style={styles.openIndicatorDot} />
                        <Text
                          style={[styles.nearbyRowName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {crumb.restaurant.name}
                        </Text>
                        {distanceMiles !== null && (
                          <Text
                            style={[
                              styles.nearbyRowDistance,
                              { color: colors.textMuted },
                            ]}
                          >
                            {formatDistance(distanceMiles)}
                          </Text>
                        )}
                      </View>
                      <CaretRightIcon size={14} color={colors.textSubtle} />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: Theme.radii.sheet,
    borderTopRightRadius: Theme.radii.sheet,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    zIndex: 35,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  dragHeader: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
  },
  grabHandle: {
    marginBottom: Theme.spacing.xs,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.xs,
  },
  selectedHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  closeSelectedButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: Theme.radii.pill,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  chipsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  selectedCardScroll: {
    paddingBottom: Theme.spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  sectionContainer: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badgeArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inboxCountBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inboxCardsContainer: {
    gap: Theme.spacing.sm,
    paddingVertical: 2,
  },
  inboxCard: {
    width: 108,
    height: 128,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  inboxCardImage: {
    width: '100%',
    height: '100%',
  },
  inboxCardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxCardEmoji: {
    fontSize: 32,
  },
  inboxCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inboxCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guidesList: {
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  guideRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guideRowEmoji: {
    fontSize: 18,
  },
  guideRowName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  nearbyList: {
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nearbyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  openIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C9070', // Sage/Pistachio Green
  },
  nearbyRowName: {
    fontSize: 14,
    fontWeight: '500',
  },
  nearbyRowDistance: {
    fontSize: 13,
  },
});
