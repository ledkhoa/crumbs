import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { GrabHandle } from '@/components/ui/GrabHandle';
import { SearchInput } from '@/components/ui/SearchInput';
import { MapCrumbDetailCard } from '@/components/map/MapCrumbDetailCard';
import {
  SparkleIcon,
  NavigationArrowIcon,
  CaretRightIcon,
  ForkKnifeIcon,
  StarIcon,
  LinkIcon,
  ArrowRightIcon,
  XCircleIcon,
} from 'phosphor-react-native';
import { haversineDistanceMiles } from '@/utils/map-clustering';
import {
  getRestaurantOpenStatus,
  isRestaurantOpenAtMoment,
} from '@/utils/opening-hours';
import { formatPriceLevel } from '@/utils/price';
import { extractSocialUrl, isValidSocialUrl } from '@/utils/social-url';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import type {
  MapCoordinates,
  MapQuickFilter,
  LocationPermissionStatus,
} from '@/types/map';
import type { GuideSummary } from '@/hooks/useMapCrumbs';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const PEEK_HEIGHT = 240;
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

function getCurrentTimeMoment(crumbs: EnrichedUserCrumb[]): DiningMomentType {
  const firstWithOffset = crumbs.find(
    (c) =>
      c.restaurant.regularOpeningHours?.utcOffsetMinutes !== undefined &&
      c.restaurant.regularOpeningHours?.utcOffsetMinutes !== null,
  );
  const offsetMinutes =
    firstWithOffset?.restaurant.regularOpeningHours?.utcOffsetMinutes;

  if (offsetMinutes !== undefined && offsetMinutes !== null) {
    const utcEpoch = Date.now();
    const localDate = new Date(utcEpoch + offsetMinutes * 60 * 1000);
    const hour = localDate.getUTCHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'late_night';
  }

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
  { key: 'open_now', label: 'Open Now' },
  { key: 'bookable', label: 'Bookable' },
  { key: 'visited', label: 'Visited' },
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

  // Fresh State Link Ingestion State
  const [pasteUrlText, setPasteUrlText] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handlePasteUrlSubmit = () => {
    if (!pasteUrlText.trim()) return;
    const extracted = extractSocialUrl(pasteUrlText);
    if (extracted.url && isValidSocialUrl(extracted.url)) {
      setUrlError(null);
      haptics.success();
      onIngestUrl?.(extracted.url);
      setPasteUrlText('');
    } else {
      haptics.error();
      setUrlError('Please enter a valid Instagram or TikTok video link');
    }
  };

  // Reanimated Sheet Height State
  const sheetHeight = useSharedValue(PEEK_HEIGHT);
  const startHeight = useSharedValue(PEEK_HEIGHT);
  const [currentDetent, setCurrentDetent] = useState<'peek' | 'mid' | 'full'>(
    'peek',
  );

  // Time-Adaptive Dining Moments State (Resolved in restaurant/destination local timezone)
  const autoMoment = useMemo(
    () => getCurrentTimeMoment(allSavedCrumbs),
    [allSavedCrumbs],
  );
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
      if (newHeight >= PEEK_HEIGHT - 25 && newHeight <= FULL_HEIGHT + 35) {
        sheetHeight.value = newHeight;
      }

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
    if (activeQuickFilter === filter && filter !== 'all') {
      onSelectQuickFilter('all');
    } else {
      onSelectQuickFilter(filter);
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
      {/* Pan Gesture Header (Grab Handle & Search/Filter Controls) */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHeader}>
          <GrabHandle style={styles.grabHandle} />

          {/* If NO pin is selected, show Search Input & Action Buttons */}
          {!selectedCrumb && (
            <>
              {/* 1. Search Bar + Decide Now + Recenter Row */}
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

              {/* 2. My Guides Selector Chips (Above the carousel) */}
              {guides.length > 0 && allSavedCrumbs.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.guidesScrollContainer}
                >
                  {/* All Guides Chip */}
                  <TouchableOpacity
                    style={[
                      styles.guideChip,
                      {
                        backgroundColor:
                          selectedGuideId === null
                            ? colors.primary
                            : colors.inputBackground,
                        borderColor:
                          selectedGuideId === null
                            ? colors.primary
                            : colors.inputBorder,
                      },
                    ]}
                    onPress={() => handleGuideChipPress(null)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="All Guides"
                  >
                    <Text
                      style={[
                        styles.guideChipText,
                        {
                          color:
                            selectedGuideId === null
                              ? colors.onPrimary
                              : colors.text,
                          fontWeight: selectedGuideId === null ? '700' : '500',
                        },
                      ]}
                    >
                      📑 All ({allSavedCrumbs.length})
                    </Text>
                  </TouchableOpacity>

                  {/* Individual Guide Chips */}
                  {guides.map((guide) => {
                    const isSelected = selectedGuideId === guide.id;
                    return (
                      <TouchableOpacity
                        key={guide.id}
                        style={[
                          styles.guideChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.inputBackground,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.inputBorder,
                          },
                        ]}
                        onPress={() => handleGuideChipPress(guide.id)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={guide.name}
                      >
                        <Text
                          style={[
                            styles.guideChipText,
                            {
                              color: isSelected
                                ? colors.onPrimary
                                : colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {guide.emojiIcon || '📑'} {guide.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* 3. Quick Status Filter Chips (All, Open Now, Bookable, Unorganized, Visited) */}
              {allSavedCrumbs.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScrollContainer}
                >
                  {FILTER_CHIPS.map((chip) => {
                    const isActive = activeQuickFilter === chip.key;
                    const label =
                      chip.key === 'all'
                        ? `All (${crumbs.length})`
                        : chip.label;

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
              )}
            </>
          )}
        </View>
      </GestureDetector>

      {/* Sheet Body: Selected Crumb Detail Card OR Fresh Onboarding OR Filtered Carousel + Time-Adaptive Moments */}
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
      ) : allSavedCrumbs.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.freshScrollContent}
          nestedScrollEnabled
        >
          <View style={styles.freshCardContainer}>
            {/* Hero Card */}
            <View
              style={[
                styles.freshHeroCard,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.freshIconCircle,
                  { backgroundColor: colors.cardBackground },
                ]}
              >
                <SparkleIcon size={26} color={colors.primary} weight="fill" />
              </View>

              <Text
                style={[
                  styles.freshTitle,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                  },
                ]}
              >
                Your Cravings Map is Fresh
              </Text>

              <Text style={[styles.freshSubtitle, { color: colors.textMuted }]}>
                Share food videos from Instagram & TikTok or paste a link below
                to watch your personal city dining map come alive.
              </Text>

              {/* Link Input Row */}
              <View style={styles.linkInputWrapper}>
                <View
                  style={[
                    styles.linkInputContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: urlError ? colors.error : colors.inputBorder,
                    },
                  ]}
                >
                  <LinkIcon size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.linkTextInput, { color: colors.text }]}
                    placeholder="Paste Instagram or TikTok link..."
                    placeholderTextColor={colors.textMuted}
                    value={pasteUrlText}
                    onChangeText={(text) => {
                      setPasteUrlText(text);
                      if (urlError) setUrlError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={handlePasteUrlSubmit}
                  />
                  {pasteUrlText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setPasteUrlText('');
                        setUrlError(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <XCircleIcon
                        size={16}
                        color={colors.textMuted}
                        weight="fill"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.addCrumbSubmitButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: pasteUrlText.trim().length > 0 ? 1 : 0.6,
                    },
                  ]}
                  onPress={handlePasteUrlSubmit}
                  disabled={!pasteUrlText.trim()}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Add crumb from link"
                >
                  <ArrowRightIcon
                    size={18}
                    color={colors.onPrimary}
                    weight="bold"
                  />
                </TouchableOpacity>
              </View>

              {urlError && (
                <Text style={[styles.urlErrorText, { color: colors.error }]}>
                  {urlError}
                </Text>
              )}
            </View>

            {/* How Crumbs Works 3-Step Guide */}
            <View style={styles.stepsContainer}>
              <Text style={[styles.stepsHeading, { color: colors.textMuted }]}>
                HOW CRUMBS WORKS
              </Text>

              <View
                style={[
                  styles.stepItemRow,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepIconBox,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <Text style={styles.stepEmoji}>📲</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    1. Share or Paste Links
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                    Tap share on any food Reel or TikTok and send to Crumbs, or
                    paste the link above.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.stepItemRow,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepIconBox,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <Text style={styles.stepEmoji}>✨</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    2. Instant AI Extraction
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                    AI pinpoints the spot, signature hero dishes, opening hours
                    & vibes.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.stepItemRow,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepIconBox,
                    { backgroundColor: colors.cardBackground },
                  ]}
                >
                  <Text style={styles.stepEmoji}>📍</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    3. Living Cravings Map
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                    Pins appear live on your personal map with real-time hours &
                    booking links.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
        >
          {/* 4. Filtered Photo Carousel (Quick Horizontal Browsing) */}
          {crumbs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
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
    paddingBottom: Theme.spacing.xs,
    gap: 6,
  },
  grabHandle: {
    marginBottom: 2,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  guidesScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  guideChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    maxWidth: 160,
  },
  guideChipText: {
    fontSize: 11,
  },
  chipsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
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
  // Fresh / Empty Map Onboarding Styles
  freshScrollContent: {
    paddingBottom: 40,
  },
  freshCardContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    gap: Theme.spacing.lg,
  },
  freshHeroCard: {
    padding: Theme.spacing.lg,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  freshIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  freshTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  freshSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  linkInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    width: '100%',
  },
  linkInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  linkTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  addCrumbSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlErrorText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  stepsContainer: {
    gap: Theme.spacing.sm,
  },
  stepsHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: Theme.spacing.xs,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    gap: Theme.spacing.md,
  },
  stepIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepTextBox: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
