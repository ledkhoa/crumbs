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
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { GrabHandle } from '@/components/ui/GrabHandle';
import { MapCrumbDetailCard } from '@/components/map/MapCrumbDetailCard';
import { MapOnboardingView } from '@/components/map/MapOnboardingView';
import {
  SparkleIcon,
  NavigationArrowIcon,
  CaretRightIcon,
  ForkKnifeIcon,
  StarIcon,
  ClockIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
} from 'phosphor-react-native';
import { haversineDistanceMiles } from '@/utils/map-clustering';
import {
  getRestaurantOpenStatus,
  isRestaurantOpenAtMoment,
} from '@/utils/opening-hours';
import { formatPriceLevel } from '@/utils/price';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import type {
  MapCoordinates,
  MapQuickFilter,
  LocationPermissionStatus,
} from '@/types/map';
import type { GuideSummary } from '@/hooks/useMapCrumbs';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const PEEK_HEIGHT = Platform.OS === 'android' ? 80 : 28;
export const MID_HEIGHT = Math.round(SCREEN_HEIGHT * 0.52);
export const FULL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.86);

const SPRING_CONFIG = {
  damping: 24,
  stiffness: 220,
  mass: 0.8,
};

export type DiningMomentType = 'morning' | 'lunch' | 'dinner' | 'late_night';

interface DiningMomentConfig {
  key: DiningMomentType;
  label: string;
  emoji: string;
  title: string;
  subtitle: string;
  keywords: string[];
}

const DINING_MOMENTS: DiningMomentConfig[] = [
  {
    key: 'morning',
    label: 'Morning',
    emoji: '🥐',
    title: 'Morning Coffee & Pastries',
    subtitle: 'Cafes, bakeries, and morning rituals',
    keywords: [
      'bakery',
      'coffee',
      'cafe',
      'breakfast',
      'pastry',
      'brunch',
      'bagel',
      'donut',
      'tea',
    ],
  },
  {
    key: 'lunch',
    label: 'Lunch',
    emoji: '🥪',
    title: 'Midday Fuel & Casual Lunch',
    subtitle: 'Quick bites, sandwiches, and midday cravings',
    keywords: [
      'lunch',
      'sandwich',
      'deli',
      'casual',
      'salad',
      'ramen',
      'tacos',
      'burger',
      'poke',
      'noodles',
      'thai',
      'mexican',
    ],
  },
  {
    key: 'dinner',
    label: 'Dinner',
    emoji: '🍷',
    title: 'Dinner & Golden Hour',
    subtitle: 'Sit-downs, wine bars, and memorable evenings',
    keywords: [
      'dinner',
      'date night',
      'wine',
      'pasta',
      'italian',
      'steak',
      'sushi',
      'bistro',
      'french',
      'seafood',
      'omakase',
      'tasting',
    ],
  },
  {
    key: 'late_night',
    label: 'Late Night',
    emoji: '🍸',
    title: 'Late Night Bites & Nightcaps',
    subtitle: 'Speakeasies, late night snacks, and cocktails',
    keywords: [
      'bar',
      'cocktail',
      'drinks',
      'late night',
      'speakeasy',
      'pizza',
      'pub',
      'lounge',
      'tapas',
      'beer',
    ],
  },
];

function getCurrentTimeMoment(): DiningMomentType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'late_night';
}

export interface LivingMapBottomSheetProps {
  crumbs: EnrichedUserCrumb[];
  allSavedCrumbs: EnrichedUserCrumb[];
  selectedCrumb: EnrichedUserCrumb | null;
  onDeselectCrumb: () => void;
  onSelectCrumb: (crumb: EnrichedUserCrumb) => void;
  onCardPress: (crumb: EnrichedUserCrumb) => void;
  onAddToGuidePress: (crumb: EnrichedUserCrumb) => void;
  onBookOrMapPress: (crumb: EnrichedUserCrumb) => void;
  onIngestUrl?: (url: string) => void;
  selectedGuideId: string | null;
  guides: GuideSummary[];
  onSelectGuide: (guideId: string | null) => void;
  activeQuickFilters?: MapQuickFilter[];
  onToggleQuickFilter?: (filter: MapQuickFilter) => void;
  activeQuickFilter?: MapQuickFilter;
  onSelectQuickFilter?: (filter: MapQuickFilter) => void;
  onRecenterPress: () => void;
  onDecideNowPress: () => void;
  isLocating?: boolean;
  userCoords: MapCoordinates | null;
  locationStatus: LocationPermissionStatus;
  bottomInset?: number;
}

const STATUS_FILTERS: Array<{
  key: MapQuickFilter;
  label: string;
  icon: typeof ClockIcon;
}> = [
  { key: 'open_now', label: 'Open Now', icon: ClockIcon },
  { key: 'bookable', label: 'Bookable', icon: CalendarCheckIcon },
  { key: 'visited', label: 'Visited', icon: CheckCircleIcon },
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
  onIngestUrl,
  selectedGuideId,
  guides,
  onSelectGuide,
  activeQuickFilters,
  onToggleQuickFilter,
  activeQuickFilter,
  onSelectQuickFilter,
  onRecenterPress,
  onDecideNowPress,
  isLocating = false,
  userCoords,
  bottomInset = 0,
}: LivingMapBottomSheetProps) {
  const { colors } = useTheme();

  const insets = useSafeAreaInsets();
  const tabHeight = Platform.OS === 'ios' ? 49 : 56;
  const navBarOffset =
    bottomInset > 0 ? bottomInset : tabHeight + insets.bottom;

  const peekHeight = PEEK_HEIGHT + navBarOffset;
  const midHeight = Math.max(
    peekHeight + 120,
    Math.round(SCREEN_HEIGHT * 0.52),
  );
  const fullHeight = Math.round(SCREEN_HEIGHT * 0.86);

  // Reanimated Sheet Height State
  const sheetHeight = useSharedValue(peekHeight);
  const startHeight = useSharedValue(peekHeight);
  const [_currentDetent, setCurrentDetent] = useState<'peek' | 'mid' | 'full'>(
    'peek',
  );

  // Sync peek height on layout / insets update
  useEffect(() => {
    if (_currentDetent === 'peek') {
      sheetHeight.value = withSpring(peekHeight, SPRING_CONFIG);
    }
  }, [peekHeight, _currentDetent, sheetHeight]);

  // When a crumb pin is selected on the map, open sheet to mid height
  useEffect(() => {
    if (selectedCrumb) {
      sheetHeight.value = withSpring(midHeight, SPRING_CONFIG);
      setCurrentDetent('mid');
      haptics.primary();
    }
  }, [selectedCrumb, midHeight, sheetHeight]);

  // Time-Adaptive Dining Moments State (Resolved in user's device local timezone)
  const autoMoment = useMemo(() => getCurrentTimeMoment(), []);
  const [selectedMomentKey, setSelectedMomentKey] =
    useState<DiningMomentType | null>(null);

  const activeMomentType = selectedMomentKey || autoMoment;
  const activeMomentConfig = useMemo(() => {
    return (
      DINING_MOMENTS.find((m) => m.key === activeMomentType) ||
      DINING_MOMENTS[2]!
    );
  }, [activeMomentType]);

  const triggerSnapHaptic = () => {
    haptics.primary();
  };

  // Gesture Handling for Smooth Snapping
  const snapTo = (detent: 'peek' | 'mid' | 'full') => {
    'worklet';
    let target = peekHeight;
    if (detent === 'peek') target = peekHeight;
    if (detent === 'mid') target = midHeight;
    if (detent === 'full') target = fullHeight;

    sheetHeight.value = withSpring(target, SPRING_CONFIG);
    scheduleOnRN(setCurrentDetent, detent);
    scheduleOnRN(triggerSnapHaptic);
  };

  const SNAP_MAGNETIC_RADIUS = 32;
  const activeSnapZone = useSharedValue<'none' | 'peek' | 'mid' | 'full'>(
    'none',
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-15, 15])
    .onStart(() => {
      'worklet';
      startHeight.value = sheetHeight.value;
      activeSnapZone.value = 'none';
    })
    .onUpdate((event) => {
      'worklet';
      const newHeight = startHeight.value - event.translationY;
      if (newHeight >= peekHeight - 25 && newHeight <= fullHeight + 35) {
        sheetHeight.value = newHeight;
      }

      let currentZone: 'none' | 'peek' | 'mid' | 'full' = 'none';
      if (Math.abs(newHeight - peekHeight) <= SNAP_MAGNETIC_RADIUS) {
        currentZone = 'peek';
      } else if (Math.abs(newHeight - midHeight) <= SNAP_MAGNETIC_RADIUS) {
        currentZone = 'mid';
      } else if (Math.abs(newHeight - fullHeight) <= SNAP_MAGNETIC_RADIUS) {
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

      if (velocity > 650) {
        if (current < midHeight) {
          snapTo('mid');
        } else {
          snapTo('full');
        }
        return;
      }
      if (velocity < -650) {
        if (current > midHeight) {
          snapTo('mid');
        } else {
          snapTo('peek');
        }
        return;
      }

      const distPeek = Math.abs(current - peekHeight);
      const distMid = Math.abs(current - midHeight);
      const distFull = Math.abs(current - fullHeight);

      if (distPeek <= SNAP_MAGNETIC_RADIUS) {
        snapTo('peek');
      } else if (distMid <= SNAP_MAGNETIC_RADIUS) {
        snapTo('mid');
      } else if (distFull <= SNAP_MAGNETIC_RADIUS) {
        snapTo('full');
      } else {
        const clampedHeight = Math.max(
          peekHeight,
          Math.min(fullHeight, current),
        );
        sheetHeight.value = withSpring(clampedHeight, SPRING_CONFIG);
        if (clampedHeight > midHeight + 40) {
          scheduleOnRN(setCurrentDetent, 'full');
        } else if (clampedHeight > peekHeight + 40) {
          scheduleOnRN(setCurrentDetent, 'mid');
        } else {
          scheduleOnRN(setCurrentDetent, 'peek');
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const selectedGuide = useMemo(
    () => guides.find((g) => g.id === selectedGuideId) || null,
    [guides, selectedGuideId],
  );

  const uncategorizedCount = useMemo(() => {
    return allSavedCrumbs.filter((c) => {
      const hasGuideIds = c.guideIds && c.guideIds.length > 0;
      const hasGuides = c.guides && c.guides.length > 0;
      return !hasGuideIds && !hasGuides;
    }).length;
  }, [allSavedCrumbs]);

  const activeFilters = useMemo<MapQuickFilter[]>(() => {
    if (activeQuickFilters) return activeQuickFilters;
    if (activeQuickFilter && activeQuickFilter !== 'all') {
      return [activeQuickFilter];
    }
    return [];
  }, [activeQuickFilters, activeQuickFilter]);

  const handleChipPress = (filter: MapQuickFilter) => {
    haptics.tap();
    if (onToggleQuickFilter) {
      onToggleQuickFilter(filter);
    } else if (onSelectQuickFilter) {
      if (activeQuickFilter === filter) {
        onSelectQuickFilter('all');
      } else {
        onSelectQuickFilter(filter);
      }
    }
  };

  const handleGuideChipPress = (guideId: string | null) => {
    haptics.tap();
    if (selectedGuideId === guideId) {
      onSelectGuide(null);
    } else {
      onSelectGuide(guideId);
    }
  };

  const formatDistance = (miles: number | null) => {
    if (miles === null) return '';
    if (miles < 0.1) return '· nearby';
    if (miles < 1) return `· ${(miles * 5280).toFixed(0)} ft`;
    return `· ${miles.toFixed(1)} mi`;
  };

  // Time-Adaptive Matching Crumbs with Operating Hours Verification
  const timeAdaptiveCrumbs = useMemo(() => {
    const keywords = activeMomentConfig.keywords;

    // Step 1: Filter to restaurants that are scheduled to be open during this dining moment
    const openDuringMoment = allSavedCrumbs.filter((c) => {
      return isRestaurantOpenAtMoment(
        c.restaurant.regularOpeningHours,
        activeMomentType,
      );
    });

    // Step 2: From those open spots, filter for keyword/vibe matches
    const keywordMatches = openDuringMoment.filter((c) => {
      const cuisine = (c.restaurant.cuisine || '').toLowerCase();
      const name = (c.restaurant.name || '').toLowerCase();
      const vibeTags = (c.postAttribution?.vibeTags || []).map((t) =>
        t.toLowerCase(),
      );
      const course = (c.postAttribution?.courseCategory || '').toLowerCase();

      return keywords.some(
        (kw) =>
          cuisine.includes(kw) ||
          name.includes(kw) ||
          course.includes(kw) ||
          vibeTags.some((tag) => tag.includes(kw)),
      );
    });

    // Step 3: Prioritize keyword matches; if few, show all spots open during this moment
    const pool = keywordMatches.length >= 2 ? keywordMatches : openDuringMoment;

    return pool.map((c) => {
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
        statusText: openStatus.statusText,
        distanceMiles,
      };
    });
  }, [allSavedCrumbs, activeMomentType, activeMomentConfig, userCoords]);

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
      {/* Pan Gesture Header (Grab Handle & Guides/Status Filter Controls) */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHeader}>
          <GrabHandle style={styles.grabHandle} />

          {/* If NO pin is selected, show Top Context Bar */}
          {!selectedCrumb && (
            <View style={styles.topContextRow}>
              <TouchableOpacity
                style={styles.titleContainer}
                onPress={() => {
                  if (sheetHeight.value <= peekHeight + 35) {
                    snapTo('mid');
                  }
                }}
                activeOpacity={0.85}
              >
                {selectedGuideId === 'uncategorized' ? (
                  <View style={styles.activeGuideTitleRow}>
                    <Text
                      style={[
                        styles.activeGuideTitle,
                        {
                          color: colors.text,
                          fontFamily:
                            Platform.OS === 'ios' ? 'Georgia' : 'serif',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      📥 Uncategorized
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.clearGuideButton,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleGuideChipPress(null)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Clear uncategorized filter"
                    >
                      <Text
                        style={[
                          styles.clearGuideText,
                          { color: colors.primary },
                        ]}
                      >
                        ✕ Clear
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : selectedGuide ? (
                  <View style={styles.activeGuideTitleRow}>
                    <Text
                      style={[
                        styles.activeGuideTitle,
                        {
                          color: colors.text,
                          fontFamily:
                            Platform.OS === 'ios' ? 'Georgia' : 'serif',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedGuide.emojiIcon || '🗺️'} {selectedGuide.name}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.clearGuideButton,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleGuideChipPress(null)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Clear guide filter"
                    >
                      <Text
                        style={[
                          styles.clearGuideText,
                          { color: colors.primary },
                        ]}
                      >
                        ✕ Clear
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.defaultTitleRow}>
                    <Text
                      style={[
                        styles.sheetTitle,
                        {
                          color: colors.text,
                          fontFamily:
                            Platform.OS === 'ios' ? 'Georgia' : 'serif',
                        },
                      ]}
                    >
                      Cravings Map
                    </Text>
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: colors.inputBackground },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          { color: colors.textMuted },
                        ]}
                      >
                        {crumbs.length}{' '}
                        {crumbs.length === 1 ? 'crumb' : 'crumbs'}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* Quick Action Buttons */}
              <View style={styles.actionButtonsRow}>
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
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Header Controls: Guides Section & Status Filters (Outside panGesture to guarantee 100% native horizontal scrolling on Android) */}
      {!selectedCrumb && (
        <View style={styles.headerControls}>
          {/* 2. Guides Section with Explicit Header */}
          {allSavedCrumbs.length > 0 && (
            <View style={styles.guidesSection}>
              <Text
                style={[styles.sectionHeading, { color: colors.textMuted }]}
              >
                GUIDES
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={styles.guidesScrollContainer}
              >
                {/* All Crumbs Card */}
                <TouchableOpacity
                  style={[
                    styles.guideCard,
                    {
                      backgroundColor:
                        selectedGuideId === null
                          ? colors.primary
                          : colors.inputBackground,
                      borderColor:
                        selectedGuideId === null
                          ? colors.primary
                          : colors.cardBorder,
                    },
                  ]}
                  onPress={() => handleGuideChipPress(null)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="All Crumbs"
                >
                  <Text style={styles.guideCardEmoji}>🗺️</Text>
                  <Text
                    style={[
                      styles.guideCardName,
                      {
                        color:
                          selectedGuideId === null
                            ? colors.onPrimary
                            : colors.text,
                        fontWeight: selectedGuideId === null ? '700' : '600',
                      },
                    ]}
                  >
                    All
                  </Text>
                  <View
                    style={[
                      styles.guideCardCountBadge,
                      {
                        backgroundColor:
                          selectedGuideId === null
                            ? 'rgba(255, 255, 255, 0.24)'
                            : colors.cardBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.guideCardCountText,
                        {
                          color:
                            selectedGuideId === null
                              ? colors.onPrimary
                              : colors.textMuted,
                          fontWeight: selectedGuideId === null ? '700' : '600',
                        },
                      ]}
                    >
                      {allSavedCrumbs.length}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Uncategorized Card */}
                <TouchableOpacity
                  style={[
                    styles.guideCard,
                    {
                      backgroundColor:
                        selectedGuideId === 'uncategorized'
                          ? colors.primary
                          : colors.inputBackground,
                      borderColor:
                        selectedGuideId === 'uncategorized'
                          ? colors.primary
                          : colors.cardBorder,
                    },
                  ]}
                  onPress={() => handleGuideChipPress('uncategorized')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Uncategorized Crumbs"
                >
                  <Text style={styles.guideCardEmoji}>📥</Text>
                  <Text
                    style={[
                      styles.guideCardName,
                      {
                        color:
                          selectedGuideId === 'uncategorized'
                            ? colors.onPrimary
                            : colors.text,
                        fontWeight:
                          selectedGuideId === 'uncategorized' ? '700' : '600',
                      },
                    ]}
                  >
                    Uncategorized
                  </Text>
                  <View
                    style={[
                      styles.guideCardCountBadge,
                      {
                        backgroundColor:
                          selectedGuideId === 'uncategorized'
                            ? 'rgba(255, 255, 255, 0.24)'
                            : colors.cardBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.guideCardCountText,
                        {
                          color:
                            selectedGuideId === 'uncategorized'
                              ? colors.onPrimary
                              : colors.textMuted,
                          fontWeight:
                            selectedGuideId === 'uncategorized' ? '700' : '600',
                        },
                      ]}
                    >
                      {uncategorizedCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Individual Guide Cards */}
                {guides.map((guide) => {
                  const isSelected = selectedGuideId === guide.id;
                  return (
                    <TouchableOpacity
                      key={guide.id}
                      style={[
                        styles.guideCard,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.inputBackground,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleGuideChipPress(guide.id)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={guide.name}
                    >
                      <Text style={styles.guideCardEmoji}>
                        {guide.emojiIcon || '📑'}
                      </Text>
                      <Text
                        style={[
                          styles.guideCardName,
                          {
                            color: isSelected ? colors.onPrimary : colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {guide.name}
                      </Text>
                      {guide.crumbCount !== undefined && (
                        <View
                          style={[
                            styles.guideCardCountBadge,
                            {
                              backgroundColor: isSelected
                                ? 'rgba(255, 255, 255, 0.24)'
                                : colors.cardBackground,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.guideCardCountText,
                              {
                                color: isSelected
                                  ? colors.onPrimary
                                  : colors.textMuted,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {guide.crumbCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 3. Quick Status Filter Chips (Open Now, Bookable, Visited) */}
          {allSavedCrumbs.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.statusFiltersScrollContainer}
            >
              {STATUS_FILTERS.map((chip) => {
                const isActive = activeFilters.includes(chip.key);
                const IconComponent = chip.icon;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: isActive
                          ? colors.inputBackground
                          : 'transparent',
                        borderColor: isActive
                          ? colors.primary
                          : colors.cardBorder,
                      },
                    ]}
                    onPress={() => handleChipPress(chip.key)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={chip.label}
                  >
                    <IconComponent
                      size={13}
                      color={isActive ? colors.primary : colors.textMuted}
                      weight={isActive ? 'fill' : 'bold'}
                    />
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color: isActive ? colors.primary : colors.textMuted,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Sheet Body: Selected Crumb Detail Card OR Fresh Onboarding OR Filtered Carousel + Time-Adaptive Moments */}
      {selectedCrumb ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.selectedCardScroll,
            { paddingBottom: navBarOffset + Theme.spacing.xl },
          ]}
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
      ) : allSavedCrumbs.length === 0 ? (
        <MapOnboardingView
          onIngestUrl={onIngestUrl}
          contentContainerStyle={{
            paddingBottom: navBarOffset + Theme.spacing.xl,
          }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: navBarOffset + Theme.spacing.xl },
          ]}
          nestedScrollEnabled
        >
          {/* 4. Filtered Photo Carousel (Quick Horizontal Browsing) */}
          {crumbs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.carouselCardsContainer}
            >
              {crumbs.map((crumb) => {
                const imageUrl =
                  crumb.restaurant.photoUrl || crumb.sourcePost?.mediaUrls?.[0];
                const effectiveHeroDish =
                  crumb.effectiveHeroDish ||
                  crumb.userHeroDishOverride ||
                  crumb.postAttribution?.heroDish ||
                  crumb.restaurant.communityFavoriteDish ||
                  null;
                const priceFormatted = formatPriceLevel(
                  crumb.restaurant.priceLevel,
                );
                const areaName =
                  crumb.restaurant.neighborhood ||
                  crumb.restaurant.city ||
                  null;

                return (
                  <TouchableOpacity
                    key={crumb.id}
                    style={[
                      styles.carouselCard,
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
                    {/* Thumbnail Image */}
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.carouselCardImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.carouselCardPlaceholder}>
                        <ForkKnifeIcon size={24} color={colors.textMuted} />
                      </View>
                    )}

                    {/* Meta Overlay */}
                    <View style={styles.carouselCardOverlay}>
                      <Text style={styles.carouselCardName} numberOfLines={1}>
                        {crumb.restaurant.name}
                      </Text>

                      <View style={styles.carouselCardMetaRow}>
                        {crumb.restaurant.rating !== null &&
                          crumb.restaurant.rating !== undefined && (
                            <View style={styles.carouselCardRating}>
                              <StarIcon
                                size={10}
                                color="#DFB064"
                                weight="fill"
                              />
                              <Text style={styles.carouselCardRatingText}>
                                {crumb.restaurant.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}

                        {Boolean(priceFormatted) && (
                          <Text style={styles.carouselCardDot}>·</Text>
                        )}
                        {Boolean(priceFormatted) && (
                          <Text style={styles.carouselCardMetaText}>
                            {priceFormatted}
                          </Text>
                        )}

                        {Boolean(areaName) && (
                          <Text style={styles.carouselCardDot}>·</Text>
                        )}
                        {Boolean(areaName) && (
                          <Text
                            style={styles.carouselCardMetaText}
                            numberOfLines={1}
                          >
                            {areaName}
                          </Text>
                        )}
                      </View>

                      {/* Hero Dish Highlight Tag */}
                      {effectiveHeroDish && (
                        <Text style={styles.carouselCardDish} numberOfLines={1}>
                          ✨ {effectiveHeroDish}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyResultsWrapper}>
              <Text
                style={[styles.emptyResultsText, { color: colors.textMuted }]}
              >
                No saved cravings match this filter.
              </Text>
            </View>
          )}

          {/* 5. Time-Adaptive Dining Moments Section */}
          <View style={styles.momentSection}>
            <View style={styles.momentHeaderRow}>
              <View style={styles.momentTitleGroup}>
                <View style={styles.momentHeadingRow}>
                  <Text
                    style={[
                      styles.momentTitle,
                      {
                        color: colors.text,
                        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                      },
                    ]}
                  >
                    {activeMomentConfig.emoji} {activeMomentConfig.title}
                  </Text>
                </View>
                <Text
                  style={[styles.momentSubtitle, { color: colors.textMuted }]}
                >
                  {activeMomentConfig.subtitle}
                </Text>
              </View>
            </View>

            {/* Time-of-Day Quick Switcher Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.momentTabsContainer}
            >
              {DINING_MOMENTS.map((m) => {
                const isActive = activeMomentType === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.momentTab,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.inputBackground,
                        borderColor: isActive
                          ? colors.primary
                          : colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setSelectedMomentKey(m.key);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={m.label}
                  >
                    <Text
                      style={[
                        styles.momentTabText,
                        {
                          color: isActive ? colors.onPrimary : colors.text,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {m.emoji} {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Matching Moments Cards List */}
            <View style={styles.momentList}>
              {timeAdaptiveCrumbs
                .slice(0, 6)
                .map(({ crumb, isOpen, statusText, distanceMiles }) => {
                  const effectiveHeroDish =
                    crumb.effectiveHeroDish ||
                    crumb.userHeroDishOverride ||
                    crumb.postAttribution?.heroDish ||
                    crumb.restaurant.communityFavoriteDish ||
                    null;
                  const areaName =
                    crumb.restaurant.neighborhood ||
                    crumb.restaurant.city ||
                    null;

                  return (
                    <TouchableOpacity
                      key={crumb.id}
                      style={[
                        styles.momentCardRow,
                        {
                          borderBottomColor: colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        haptics.tap();
                        onSelectCrumb(crumb);
                      }}
                      activeOpacity={0.7}
                    >
                      {/* Left Thumbnail */}
                      {crumb.restaurant.photoUrl ||
                      crumb.sourcePost?.mediaUrls?.[0] ? (
                        <Image
                          source={{
                            uri:
                              crumb.restaurant.photoUrl ||
                              crumb.sourcePost?.mediaUrls?.[0],
                          }}
                          style={styles.momentThumb}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View
                          style={[
                            styles.momentThumbPlaceholder,
                            { backgroundColor: colors.inputBackground },
                          ]}
                        >
                          <ForkKnifeIcon size={16} color={colors.textMuted} />
                        </View>
                      )}

                      {/* Info Column */}
                      <View style={styles.momentInfoCol}>
                        <View style={styles.momentRowTop}>
                          <Text
                            style={[
                              styles.momentRestaurantName,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {crumb.restaurant.name}
                          </Text>

                          {Boolean(areaName) && (
                            <Text
                              style={[
                                styles.momentNeighborhood,
                                { color: colors.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {areaName}
                            </Text>
                          )}
                        </View>

                        {/* Hero Dish Highlight or Status */}
                        <View style={styles.momentRowBottom}>
                          {effectiveHeroDish ? (
                            <Text
                              style={[
                                styles.momentDishText,
                                { color: colors.primary },
                              ]}
                              numberOfLines={1}
                            >
                              ✨ {effectiveHeroDish}
                            </Text>
                          ) : (
                            <View style={styles.statusInlineRow}>
                              <View
                                style={[
                                  styles.statusDotSmall,
                                  {
                                    backgroundColor: isOpen
                                      ? colors.success
                                      : colors.textMuted,
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.statusInlineText,
                                  {
                                    color: isOpen
                                      ? colors.success
                                      : colors.textMuted,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {statusText}
                              </Text>
                            </View>
                          )}

                          {distanceMiles !== null && (
                            <Text
                              style={[
                                styles.momentDistanceText,
                                { color: colors.textSubtle },
                              ]}
                            >
                              {formatDistance(distanceMiles)}
                            </Text>
                          )}
                        </View>
                      </View>

                      <CaretRightIcon size={14} color={colors.textSubtle} />
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
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
    paddingBottom: 2,
    gap: 4,
  },
  headerControls: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
    gap: 6,
  },
  grabHandle: {
    marginBottom: 2,
  },
  topContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: Theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  defaultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radii.pill,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeGuideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    flexWrap: 'nowrap',
  },
  activeGuideTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  clearGuideButton: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
  },
  clearGuideText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  guidesSection: {
    gap: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  guidesScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    height: 33,
    maxWidth: 190,
  },
  guideCardEmoji: {
    fontSize: 13,
  },
  guideCardName: {
    fontSize: 12,
    flexShrink: 1,
  },
  guideCardCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Theme.radii.pill,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCardCountText: {
    fontSize: 10,
  },
  statusFiltersScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    height: 27,
  },
  statusChipText: {
    fontSize: 11,
  },
  selectedCardScroll: {
    paddingBottom: Theme.spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
    gap: Theme.spacing.md,
  },
  carouselCardsContainer: {
    gap: Theme.spacing.sm,
    paddingVertical: 4,
  },
  carouselCard: {
    width: 170,
    height: 124,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselCardImage: {
    width: '100%',
    height: '100%',
  },
  carouselCardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  carouselCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  carouselCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  carouselCardRatingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  carouselCardDot: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
  },
  carouselCardMetaText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '500',
  },
  carouselCardDish: {
    color: '#E89078',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyResultsWrapper: {
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  momentSection: {
    marginTop: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  momentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  momentTitleGroup: {
    gap: 2,
  },
  momentHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  momentTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  momentSubtitle: {
    fontSize: 12,
  },
  momentTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  momentTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
  },
  momentTabText: {
    fontSize: 11,
  },
  momentList: {
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
  },
  momentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  momentThumb: {
    width: 46,
    height: 46,
    borderRadius: Theme.radii.md,
  },
  momentThumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentInfoCol: {
    flex: 1,
    gap: 3,
  },
  momentRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  momentRestaurantName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  momentNeighborhood: {
    fontSize: 11,
    fontWeight: '500',
  },
  momentRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  momentDishText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  statusInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusInlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  momentDistanceText: {
    fontSize: 11,
  },
});
