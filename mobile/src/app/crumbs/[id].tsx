import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { openDefaultMaps } from '@/utils/maps';
import { getRestaurantOpenStatus } from '@/utils/opening-hours';
import {
  useCrumbDetailQuery,
  useUpdateCrumbMutation,
  useDeleteCrumbMutation,
} from '@/hooks/useCrumbs';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StarRating } from '@/components/ui/StarRating';
import { Badge } from '@/components/ui/Badge';
import { SocialPlatformIcon } from '@/components/ui/SocialPlatformIcon';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import {
  CaretLeftIcon,
  CaretDownIcon,
  CaretUpIcon,
  ArrowSquareOutIcon,
  PlusIcon,
  ForkKnifeIcon,
  ClockIcon,
  WineIcon,
  NavigationArrowIcon,
  GlobeIcon,
  CheckCircleIcon,
  SparkleIcon,
  LightbulbIcon,
  DoorIcon,
  QuotesIcon,
  BookOpenIcon,
  FolderSimpleIcon,
  NotePencilIcon,
  TrashIcon,
  WarningCircleIcon,
  MapPinIcon,
} from 'phosphor-react-native';
import type { CrumbDetail } from '@api/modules/crumbs/crumbs.types';

export default function CrumbDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const crumbId = Array.isArray(id) ? (id[0] ?? '') : (id ?? '');

  const {
    data: rawData,
    isLoading,
    isError,
    refetch,
  } = useCrumbDetailQuery(crumbId);

  // SAFETY: Server returns CrumbDetail directly on 200 OK
  const crumb = rawData as CrumbDetail | undefined;

  const updateMutation = useUpdateCrumbMutation();
  const deleteMutation = useDeleteCrumbMutation();
  const addGuideMutation = useAddCrumbToGuideMutation();

  // Media Gallery Active Index
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Expandable Weekly Hours
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);

  // Inline Editing Form State
  const [notes, setNotes] = useState('');
  const [heroDishOverride, setHeroDishOverride] = useState('');
  const [isEditingDishOverride, setIsEditingDishOverride] = useState(false);
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);

  // Synchronize local form inputs when crumb data loads or changes
  useEffect(() => {
    if (crumb) {
      setNotes(crumb.userNotes || '');
      setHeroDishOverride(crumb.userHeroDishOverride || '');
    }
  }, [crumb]);

  // Aggregate media items (Google Places photo + Source Post carousel images)
  const mediaList = useMemo(() => {
    if (!crumb) return [];
    const list: string[] = [];
    if (crumb.restaurant.photoUrl) {
      list.push(crumb.restaurant.photoUrl);
    }
    if (crumb.sourcePost?.mediaUrls) {
      for (const url of crumb.sourcePost.mediaUrls) {
        if (!list.includes(url)) {
          list.push(url);
        }
      }
    }
    return list;
  }, [crumb]);

  const activeMediaUrl =
    mediaList[activeMediaIndex] || crumb?.restaurant.photoUrl;

  const isFormDirty = useMemo(() => {
    if (!crumb) return false;
    const initialNotes = crumb.userNotes || '';
    const initialDish = crumb.userHeroDishOverride || '';
    return notes !== initialNotes || heroDishOverride !== initialDish;
  }, [crumb, notes, heroDishOverride]);

  const openStatus = useMemo(
    () => getRestaurantOpenStatus(crumb?.restaurant.regularOpeningHours),
    [crumb?.restaurant.regularOpeningHours],
  );
  const currentWeekdayIndex =
    openStatus.currentLocalDay >= 0 ? (openStatus.currentLocalDay + 6) % 7 : -1;

  const handleToggleVisited = () => {
    if (!crumb) return;
    haptics.selection();
    const newVisited = !crumb.isVisited;
    updateMutation.mutate({
      crumbId: crumb.id,
      input: {
        isVisited: newVisited,
      },
    });
  };

  const handleSaveNotes = async () => {
    if (!crumb) return;
    haptics.primary();
    try {
      await updateMutation.mutateAsync({
        crumbId: crumb.id,
        input: {
          userNotes: notes.trim() || null,
          userHeroDishOverride: heroDishOverride.trim() || null,
        },
      });
      setIsEditingDishOverride(false);
    } catch (err) {
      console.warn('[CrumbDetail] Failed to save notes:', err);
    }
  };

  const handleDeleteCrumb = () => {
    if (!crumb) return;
    haptics.warning();
    Alert.alert(
      'Remove Crumb',
      `Are you sure you want to remove "${crumb.restaurant.name}" from your crumbs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(crumb.id);
              router.back();
            } catch (err) {
              console.warn('[CrumbDetail] Delete error:', err);
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!crumb) return;
    haptics.tap();
    const shareUrl =
      crumb.restaurant.websiteUrl ||
      crumb.restaurant.mapsUrl ||
      crumb.sourcePost?.originalUrl;
    try {
      await Share.share({
        title: crumb.restaurant.name,
        message: `Check out ${crumb.restaurant.name}${
          crumb.effectiveHeroDish
            ? ` (Hero dish: ${crumb.effectiveHeroDish})`
            : ''
        }${shareUrl ? `\n${shareUrl}` : ''}`,
        url: shareUrl || undefined,
      });
    } catch (err) {
      console.warn('[CrumbDetail] Share failed:', err);
    }
  };

  const handleGuideSelected = async (guideId: string) => {
    if (!crumb) return;
    try {
      await addGuideMutation.mutateAsync({
        guideId,
        crumbIds: [crumb.id],
      });
      refetch();
    } catch (err) {
      console.warn('[CrumbDetail] Failed to add to guide:', err);
    }
    setIsGuideModalVisible(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingHeader}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <Skeleton width={80} height={36} borderRadius={18} />
        </View>
        <View style={styles.loadingBody}>
          <Skeleton width="100%" height={260} borderRadius={Theme.radii.lg} />
          <View style={{ height: 20 }} />
          <Skeleton width="70%" height={32} borderRadius={8} />
          <View style={{ height: 10 }} />
          <Skeleton width="40%" height={20} borderRadius={6} />
          <View style={{ height: 24 }} />
          <Skeleton width="100%" height={90} borderRadius={Theme.radii.md} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !crumb) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backButtonIcon, { color: colors.text }]}>
              ‹
            </Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          icon={
            <WarningCircleIcon
              size={36}
              color={colors.textSubtle}
              weight="regular"
            />
          }
          title="Crumb Not Found"
          description="We couldn't load the details for this crumb. It may have been deleted."
          action={
            <Button variant="primary" size="md" onPress={() => router.back()}>
              Back to Inbox
            </Button>
          }
          style={styles.errorEmptyState}
        />
      </SafeAreaView>
    );
  }

  const { restaurant, sourcePost, postAttribution, guides } = crumb;
  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const locationSubtitle = [
    restaurant.neighborhood,
    restaurant.city,
    restaurant.state,
  ]
    .filter(Boolean)
    .join(', ');

  const weekdayDescriptions =
    restaurant.regularOpeningHours?.weekdayDescriptions || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Floating Glass Navigation Bar */}
      <SafeAreaView edges={['top']} style={styles.navBarWrapper}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[
              styles.floatingNavButton,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => {
              haptics.tap();
              router.back();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <CaretLeftIcon size={22} color={colors.text} weight="bold" />
          </TouchableOpacity>

          <View style={styles.navRightActions}>
            <TouchableOpacity
              style={[
                styles.floatingActionPill,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                haptics.primary();
                setIsGuideModalVisible(true);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add to guide"
            >
              <PlusIcon size={14} color={colors.onPrimary} weight="bold" />
              <Text style={styles.floatingActionText}>Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.floatingNavButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Share crumb"
            >
              <ArrowSquareOutIcon size={20} color={colors.text} weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bottomOffset={40}
      >
        {/* Hero Photo & Media Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageContainer}>
            {activeMediaUrl ? (
              <Image
                source={{ uri: activeMediaUrl }}
                style={styles.heroImage}
                contentFit="cover"
                transition={250}
              />
            ) : (
              <View
                style={[
                  styles.heroImagePlaceholder,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <ForkKnifeIcon size={48} color={colors.textSubtle} />
              </View>
            )}

            {/* Translucent Overlays */}
            {sourcePost?.authorUsername ? (
              <View style={styles.heroTopBadges}>
                <TouchableOpacity
                  style={[
                    styles.creatorGlassBadge,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    if (sourcePost.originalUrl) {
                      Linking.openURL(sourcePost.originalUrl).catch(() => {});
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <SocialPlatformIcon
                    platform={sourcePost.platform}
                    size={14}
                    color={colors.text}
                  />
                  <Text
                    style={[styles.creatorBadgeText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    @{sourcePost.authorUsername}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Swipeable Media Thumbnail Strip */}
          {mediaList.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailStrip}
            >
              {mediaList.map((url, idx) => {
                const isSelected = idx === activeMediaIndex;
                return (
                  <TouchableOpacity
                    key={`${url}-${idx}`}
                    style={[
                      styles.thumbnailWrapper,
                      isSelected && styles.thumbnailWrapperSelected,
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setActiveMediaIndex(idx);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.contentBody}>
          {/* Restaurant Identity & Spatial Details */}
          <View style={styles.titleSection}>
            <Text style={[styles.restaurantTitle, { color: colors.text }]}>
              {restaurant.name}
            </Text>

            <View style={styles.metaSummaryRow}>
              {formattedPrice ? (
                <Text style={[styles.metaTagText, { color: colors.textMuted }]}>
                  {formattedPrice}
                </Text>
              ) : null}
              {formattedPrice && restaurant.cuisine ? (
                <Text style={[styles.metaDot, { color: colors.textSubtle }]}>
                  ·
                </Text>
              ) : null}
              {restaurant.cuisine ? (
                <Text style={[styles.metaTagText, { color: colors.textMuted }]}>
                  {restaurant.cuisine}
                </Text>
              ) : null}
              {(formattedPrice || restaurant.cuisine) && restaurant.rating ? (
                <Text style={[styles.metaDot, { color: colors.textSubtle }]}>
                  ·
                </Text>
              ) : null}
              {restaurant.rating ? (
                <StarRating
                  rating={restaurant.rating}
                  count={restaurant.userRatingCount}
                  size="md"
                />
              ) : null}
            </View>
            {locationSubtitle ? (
              <View style={styles.locationSubtitleRow}>
                <MapPinIcon size={14} color={colors.primary} weight="fill" />
                <Text style={[styles.locationSubtitle, { color: colors.text }]}>
                  {locationSubtitle}
                </Text>
              </View>
            ) : null}
            {restaurant.formattedAddress ? (
              <Text
                style={[styles.addressDetail, { color: colors.textSubtle }]}
              >
                {restaurant.formattedAddress}
              </Text>
            ) : null}
          </View>

          {/* Expandable Opening Hours Accordion */}
          {weekdayDescriptions.length > 0 && (
            <View
              style={[
                styles.hoursCard,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.hoursHeader}
                onPress={() => {
                  haptics.tap();
                  setIsHoursExpanded((prev) => !prev);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.hoursHeaderLeft}>
                  <ClockIcon
                    size={16}
                    color={openStatus.isOpen ? '#3B6B38' : colors.textMuted}
                    weight="bold"
                  />
                  <Text
                    style={[styles.hoursHeaderText, { color: colors.text }]}
                  >
                    {openStatus.statusText || 'Opening Hours'}
                  </Text>
                  {openStatus.statusText ? (
                    <View
                      style={[
                        styles.statusDot,
                        openStatus.isOpen
                          ? styles.statusDotOpen
                          : { backgroundColor: colors.textSubtle },
                      ]}
                    />
                  ) : null}
                </View>
                {isHoursExpanded ? (
                  <CaretUpIcon
                    size={16}
                    color={colors.textMuted}
                    weight="bold"
                  />
                ) : (
                  <CaretDownIcon
                    size={16}
                    color={colors.textMuted}
                    weight="bold"
                  />
                )}
              </TouchableOpacity>

              {isHoursExpanded && (
                <View
                  style={[
                    styles.hoursDropdown,
                    { borderTopColor: colors.inputBorder },
                  ]}
                >
                  {weekdayDescriptions.map((desc, idx) => {
                    const isToday = idx === currentWeekdayIndex;
                    return (
                      <View
                        key={`${desc}-${idx}`}
                        style={[
                          styles.hoursRow,
                          isToday && styles.hoursRowToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.hoursRowText,
                            { color: colors.textMuted },
                            isToday && [
                              styles.hoursRowTextToday,
                              { color: colors.text },
                            ],
                          ]}
                        >
                          {desc}
                        </Text>
                        {isToday ? (
                          <Text style={styles.todayBadgeText}>Today</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Primary Action Capsule */}
          <View style={styles.actionCapsuleRow}>
            {restaurant.reservationUrl ? (
              <TouchableOpacity
                style={[styles.actionCapsule, styles.reserveCapsule]}
                onPress={() => {
                  haptics.primary();
                  Linking.openURL(restaurant.reservationUrl!).catch(() => {});
                }}
                activeOpacity={0.85}
              >
                <WineIcon size={16} color="#3B6B38" weight="fill" />
                <Text style={styles.reserveCapsuleText}>
                  Book{' '}
                  {restaurant.reservationProvider
                    ? `(${restaurant.reservationProvider})`
                    : 'Table'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.actionCapsule,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => {
                haptics.tap();
                openDefaultMaps({
                  name: restaurant.name,
                  address: restaurant.formattedAddress,
                  latitude: restaurant.latitude,
                  longitude: restaurant.longitude,
                });
              }}
              activeOpacity={0.8}
            >
              <NavigationArrowIcon
                size={16}
                color={colors.text}
                weight="fill"
              />
              <Text style={[styles.actionCapsuleText, { color: colors.text }]}>
                Directions
              </Text>
            </TouchableOpacity>

            {restaurant.websiteUrl ? (
              <TouchableOpacity
                style={[
                  styles.actionCapsule,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  haptics.tap();
                  Linking.openURL(restaurant.websiteUrl!).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <GlobeIcon size={16} color={colors.text} weight="bold" />
                <Text
                  style={[styles.actionCapsuleText, { color: colors.text }]}
                >
                  Web
                </Text>
              </TouchableOpacity>
            ) : null}

            {sourcePost?.originalUrl ? (
              <TouchableOpacity
                style={[
                  styles.actionCapsule,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => {
                  haptics.tap();
                  Linking.openURL(sourcePost.originalUrl).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <SocialPlatformIcon
                  platform={sourcePost.platform}
                  size={16}
                  color={colors.text}
                />
                <Text
                  style={[styles.actionCapsuleText, { color: colors.text }]}
                >
                  Reel
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Mark As Visited Toggle CTA */}
          <View style={styles.visitedBannerRow}>
            <TouchableOpacity
              style={[
                styles.visitedButton,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                },
                crumb.isVisited && styles.visitedButtonActive,
              ]}
              onPress={handleToggleVisited}
              activeOpacity={0.85}
            >
              <CheckCircleIcon
                size={18}
                color={crumb.isVisited ? '#3B6B38' : colors.text}
                weight={crumb.isVisited ? 'fill' : 'bold'}
              />
              <Text
                style={[
                  styles.visitedButtonText,
                  { color: colors.text },
                  crumb.isVisited && styles.visitedButtonTextActive,
                ]}
              >
                {crumb.isVisited ? 'Dined Here · Visited' : 'Mark as Visited'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hero Dish Highlight Callout */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <SparkleIcon size={15} color={colors.primary} weight="fill" />
                <Text
                  style={[styles.sectionTitle, { color: colors.textSubtle }]}
                >
                  MUST-ORDER DISH
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setIsEditingDishOverride((prev) => !prev);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.editPillText, { color: colors.primary }]}>
                  {isEditingDishOverride ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditingDishOverride ? (
              <View style={styles.editDishContainer}>
                <Input
                  value={heroDishOverride}
                  onChangeText={setHeroDishOverride}
                  placeholder="e.g. Truffle Gnocchi, Pistachio Croissant"
                  label="Custom Favorite Dish"
                />
              </View>
            ) : (
              <View style={styles.heroDishRow}>
                <Text
                  style={[styles.heroDishName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {crumb.effectiveHeroDish ||
                    restaurant.communityFavoriteDish ||
                    'Explore menu signatures'}
                </Text>
                {crumb.userHeroDishOverride ? (
                  <Badge variant="hero" size="sm" label="Your Pick" />
                ) : postAttribution?.heroDish ? (
                  <Badge variant="accent" size="sm" label="Creator Highlight" />
                ) : null}
              </View>
            )}
          </View>

          {/* Recommended Dishes Tags */}
          {postAttribution?.recommendedDishes &&
            postAttribution.recommendedDishes.length > 0 && (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.sectionTitleWithIcon}>
                  <ForkKnifeIcon
                    size={15}
                    color={colors.textMuted}
                    weight="bold"
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.textSubtle }]}
                  >
                    RECOMMENDED DISHES
                  </Text>
                </View>
                <View style={styles.dishTagsGrid}>
                  {postAttribution.recommendedDishes.map((dish, idx) => (
                    <View
                      key={`${dish}-${idx}`}
                      style={[
                        styles.dishChip,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.dishChipText, { color: colors.text }]}
                      >
                        • {dish}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Vibe Tags & Atmosphere */}
          {postAttribution?.vibeTags && postAttribution.vibeTags.length > 0 && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionTitleWithIcon}>
                <SparkleIcon size={15} color={colors.accent} weight="fill" />
                <Text
                  style={[styles.sectionTitle, { color: colors.textSubtle }]}
                >
                  VIBE & ATMOSPHERE
                </Text>
              </View>
              <View style={styles.vibeTagsGrid}>
                {postAttribution.vibeTags.map((vibe, idx) => (
                  <View
                    key={`${vibe}-${idx}`}
                    style={[
                      styles.vibeChip,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.vibeChipText, { color: colors.text }]}>
                      {vibe}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Walk-in Tips & Creator Notes */}
          {(postAttribution?.walkInTips ||
            postAttribution?.creatorNotes ||
            restaurant.editorialSummary) && (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={styles.sectionTitleWithIcon}>
                <LightbulbIcon size={15} color={colors.accent} weight="fill" />
                <Text
                  style={[styles.sectionTitle, { color: colors.textSubtle }]}
                >
                  INSIDER TIPS
                </Text>
              </View>
              {postAttribution?.walkInTips ? (
                <View style={styles.tipRow}>
                  <DoorIcon size={16} color={colors.textMuted} weight="bold" />
                  <Text style={[styles.tipText, { color: colors.text }]}>
                    <Text style={[styles.tipBold, { color: colors.text }]}>
                      Walk-in tip:{' '}
                    </Text>
                    {postAttribution.walkInTips}
                  </Text>
                </View>
              ) : null}

              {postAttribution?.creatorNotes ? (
                <View style={styles.tipRow}>
                  <QuotesIcon
                    size={16}
                    color={colors.textMuted}
                    weight="fill"
                  />
                  <Text style={[styles.tipText, { color: colors.text }]}>
                    <Text style={[styles.tipBold, { color: colors.text }]}>
                      Creator quote:{' '}
                    </Text>
                    "{postAttribution.creatorNotes}"
                  </Text>
                </View>
              ) : null}

              {restaurant.editorialSummary && !postAttribution?.creatorNotes ? (
                <View style={styles.tipRow}>
                  <BookOpenIcon
                    size={16}
                    color={colors.textMuted}
                    weight="bold"
                  />
                  <Text style={[styles.tipText, { color: colors.text }]}>
                    {restaurant.editorialSummary}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Guides Section */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <FolderSimpleIcon
                  size={15}
                  color={colors.textMuted}
                  weight="bold"
                />
                <Text
                  style={[styles.sectionTitle, { color: colors.textSubtle }]}
                >
                  IN YOUR GUIDES
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  haptics.primary();
                  setIsGuideModalVisible(true);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.editPillText, { color: colors.primary }]}>
                  + Add to Guide
                </Text>
              </TouchableOpacity>
            </View>

            {guides && guides.length > 0 ? (
              <View style={styles.guidesGrid}>
                {guides.map((g) => (
                  <View
                    key={g.id}
                    style={[
                      styles.guideBadge,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.guideBadgeText, { color: colors.text }]}
                    >
                      {g.emojiIcon} {g.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.unorganizedGuideText,
                  { color: colors.textMuted },
                ]}
              >
                Not assigned to any guides yet. Add to a guide to organize your
                crumb trail!
              </Text>
            )}
          </View>

          {/* Personal Notes & Inline Editor */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.sectionTitleWithIcon}>
              <NotePencilIcon
                size={15}
                color={colors.textMuted}
                weight="bold"
              />
              <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>
                YOUR PERSONAL NOTES
              </Text>
            </View>
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder="Add your personal tips, favorite tables, date night notes..."
              minHeight={90}
            />

            {/* Dynamic Save Changes CTA button */}
            {isFormDirty && (
              <View style={styles.saveChangesContainer}>
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleSaveNotes}
                  loading={updateMutation.isPending}
                  style={styles.saveChangesButton}
                >
                  Save Changes
                </Button>
              </View>
            )}
          </View>

          {/* Destructive Actions */}
          <View style={styles.footerActions}>
            <Button
              variant="ghost"
              size="md"
              onPress={handleDeleteCrumb}
              loading={deleteMutation.isPending}
              leftIcon={
                <TrashIcon size={16} color={colors.error} weight="bold" />
              }
              textStyle={{ color: colors.error }}
            >
              Remove from My Crumbs
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Guide Picker Modal */}
      {isGuideModalVisible && (
        <QuickAddToGuideModal
          visible={isGuideModalVisible}
          restaurantName={restaurant.name}
          crumbId={crumb.id}
          onClose={() => setIsGuideModalVisible(false)}
          onGuideSelected={handleGuideSelected}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  loadingBody: {
    paddingHorizontal: Theme.spacing.lg,
  },
  errorEmptyState: {
    marginTop: Theme.spacing.xxl,
  },
  navBarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  floatingNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 244, 239, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    fontSize: 28,
    lineHeight: 30,
    color: Theme.colors.text,
    fontWeight: '300',
    marginTop: -2,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  floatingActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  shareIcon: {
    fontSize: 17,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxl + 30,
  },
  heroSection: {
    width: '100%',
  },
  heroImageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: Theme.colors.inputBackground,
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderEmoji: {
    fontSize: 60,
  },
  heroTopBadges: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorGlassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxWidth: '90%',
  },
  creatorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
    flexShrink: 1,
  },
  thumbnailStrip: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: Theme.radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailWrapperSelected: {
    borderColor: Theme.colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contentBody: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  titleSection: {
    gap: 4,
  },
  restaurantTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    lineHeight: 32,
  },
  metaSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  metaTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: Theme.colors.textSubtle,
  },
  locationSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  addressDetail: {
    fontSize: 12,
    color: Theme.colors.textSubtle,
    marginTop: 1,
  },
  hoursCard: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    overflow: 'hidden',
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
  },
  hoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoursHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 2,
  },
  statusDotOpen: {
    backgroundColor: '#3B6B38',
  },
  statusDotClosed: {
    backgroundColor: Theme.colors.textSubtle,
  },
  hoursDropdown: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.inputBorder,
    paddingTop: 8,
    gap: 4,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  hoursRowToday: {
    backgroundColor: 'rgba(124, 144, 112, 0.12)',
  },
  hoursRowText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  hoursRowTextToday: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B6B38',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionCapsuleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  reserveCapsule: {
    backgroundColor: 'rgba(124, 144, 112, 0.15)',
    borderColor: 'rgba(124, 144, 112, 0.4)',
  },
  reserveCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B6B38',
  },
  visitedBannerRow: {
    width: '100%',
  },
  visitedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  visitedButtonActive: {
    backgroundColor: 'rgba(124, 144, 112, 0.15)',
    borderColor: 'rgba(124, 144, 112, 0.4)',
  },
  visitedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  visitedButtonTextActive: {
    color: '#3B6B38',
  },
  sectionCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.md,
    gap: 8,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSubtle,
    letterSpacing: 0.6,
  },
  editPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  heroDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  heroDishName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  editDishContainer: {
    marginTop: 4,
  },
  dishTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dishChip: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  dishChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  vibeTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vibeChip: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  vibeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  tipEmoji: {
    fontSize: 14,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
    lineHeight: 19,
  },
  tipBold: {
    fontWeight: '700',
    color: Theme.colors.text,
  },
  guidesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  guideBadge: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  guideBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  unorganizedGuideText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 17,
  },
  saveChangesContainer: {
    marginTop: Theme.spacing.sm,
  },
  saveChangesButton: {
    width: '100%',
  },
  footerActions: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xxl,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.error,
  },
});
