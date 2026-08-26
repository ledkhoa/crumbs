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
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
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
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import type { CrumbDetail } from '@api/modules/crumbs/crumbs.types';

export default function CrumbDetailScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.container} edges={['top']}>
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonIcon}>‹</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          emoji="🍞"
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
    <View style={styles.container}>
      {/* Top Floating Glass Navigation Bar */}
      <SafeAreaView edges={['top']} style={styles.navBarWrapper}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.floatingNavButton}
            onPress={() => {
              haptics.tap();
              router.back();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.navRightActions}>
            <TouchableOpacity
              style={styles.floatingActionPill}
              onPress={() => {
                haptics.primary();
                setIsGuideModalVisible(true);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add to guide"
            >
              <Text style={styles.floatingActionText}>🗺️ + Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingNavButton}
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Share crumb"
            >
              <Text style={styles.shareIcon}>↗</Text>
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
              <View style={styles.heroImagePlaceholder}>
                <Text style={styles.heroPlaceholderEmoji}>🍽️</Text>
              </View>
            )}

            {/* Translucent Overlays */}
            {sourcePost?.authorUsername ? (
              <View style={styles.heroTopBadges}>
                <TouchableOpacity
                  style={styles.creatorGlassBadge}
                  onPress={() => {
                    if (sourcePost.originalUrl) {
                      Linking.openURL(sourcePost.originalUrl).catch(() => {});
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.creatorBadgeText}>
                    {sourcePost.platform === 'tiktok' ? '🎵' : '📸'} @
                    {sourcePost.authorUsername} ↗
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
            <Text style={styles.restaurantTitle}>{restaurant.name}</Text>

            <View style={styles.metaSummaryRow}>
              {formattedPrice ? (
                <Text style={styles.metaTagText}>{formattedPrice}</Text>
              ) : null}
              {formattedPrice && restaurant.cuisine ? (
                <Text style={styles.metaDot}>·</Text>
              ) : null}
              {restaurant.cuisine ? (
                <Text style={styles.metaTagText}>{restaurant.cuisine}</Text>
              ) : null}
              {(formattedPrice || restaurant.cuisine) && restaurant.rating ? (
                <Text style={styles.metaDot}>·</Text>
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
              <Text style={styles.locationSubtitle}>📍 {locationSubtitle}</Text>
            ) : null}
            {restaurant.formattedAddress ? (
              <Text style={styles.addressDetail}>
                {restaurant.formattedAddress}
              </Text>
            ) : null}
          </View>

          {/* Expandable Opening Hours Accordion */}
          {weekdayDescriptions.length > 0 && (
            <View style={styles.hoursCard}>
              <TouchableOpacity
                style={styles.hoursHeader}
                onPress={() => {
                  haptics.tap();
                  setIsHoursExpanded((prev) => !prev);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.hoursHeaderLeft}>
                  <Text style={styles.hoursIcon}>🕒</Text>
                  <Text style={styles.hoursHeaderText}>Opening Hours</Text>
                </View>
                <Text style={styles.hoursChevron}>
                  {isHoursExpanded ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>

              {isHoursExpanded && (
                <View style={styles.hoursDropdown}>
                  {weekdayDescriptions.map((desc, idx) => (
                    <Text key={`${desc}-${idx}`} style={styles.hoursRowText}>
                      {desc}
                    </Text>
                  ))}
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
                <Text style={styles.reserveCapsuleText}>
                  🍷 Book{' '}
                  {restaurant.reservationProvider
                    ? `(${restaurant.reservationProvider})`
                    : 'Table'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionCapsule}
              onPress={() => {
                haptics.tap();
                const mapsUrl =
                  restaurant.mapsUrl ||
                  `https://maps.apple.com/?q=${encodeURIComponent(
                    `${restaurant.name} ${restaurant.formattedAddress || ''}`,
                  )}`;
                Linking.openURL(mapsUrl).catch(() => {});
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCapsuleText}>📍 Directions</Text>
            </TouchableOpacity>

            {restaurant.websiteUrl ? (
              <TouchableOpacity
                style={styles.actionCapsule}
                onPress={() => {
                  haptics.tap();
                  Linking.openURL(restaurant.websiteUrl!).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCapsuleText}>🌐 Web</Text>
              </TouchableOpacity>
            ) : null}

            {sourcePost?.originalUrl ? (
              <TouchableOpacity
                style={styles.actionCapsule}
                onPress={() => {
                  haptics.tap();
                  Linking.openURL(sourcePost.originalUrl).catch(() => {});
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCapsuleText}>
                  {sourcePost.platform === 'tiktok' ? '🎵 Reel' : '📸 Reel'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Mark As Visited Toggle CTA */}
          <View style={styles.visitedBannerRow}>
            <TouchableOpacity
              style={[
                styles.visitedButton,
                crumb.isVisited && styles.visitedButtonActive,
              ]}
              onPress={handleToggleVisited}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.visitedButtonText,
                  crumb.isVisited && styles.visitedButtonTextActive,
                ]}
              >
                {crumb.isVisited
                  ? '✓ Dined Here · Visited'
                  : '🍽️ Mark as Visited'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hero Dish Highlight Callout */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🍝 MUST-ORDER DISH</Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setIsEditingDishOverride((prev) => !prev);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.editPillText}>
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
              <View style={styles.heroDishBox}>
                <Text style={styles.heroDishName}>
                  {crumb.effectiveHeroDish ||
                    restaurant.communityFavoriteDish ||
                    'Explore menu signatures'}
                </Text>
                {crumb.userHeroDishOverride ? (
                  <Text style={styles.heroDishBadge}>Your Pick</Text>
                ) : postAttribution?.heroDish ? (
                  <Text style={styles.heroDishBadge}>Creator Highlight</Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Recommended Dishes Tags */}
          {postAttribution?.recommendedDishes &&
            postAttribution.recommendedDishes.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🍽️ RECOMMENDED DISHES</Text>
                <View style={styles.dishTagsGrid}>
                  {postAttribution.recommendedDishes.map((dish, idx) => (
                    <View key={`${dish}-${idx}`} style={styles.dishChip}>
                      <Text style={styles.dishChipText}>• {dish}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Vibe Tags & Atmosphere */}
          {postAttribution?.vibeTags && postAttribution.vibeTags.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>✨ VIBE & ATMOSPHERE</Text>
              <View style={styles.vibeTagsGrid}>
                {postAttribution.vibeTags.map((vibe, idx) => (
                  <View key={`${vibe}-${idx}`} style={styles.vibeChip}>
                    <Text style={styles.vibeChipText}>{vibe}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Walk-in Tips & Creator Notes */}
          {(postAttribution?.walkInTips ||
            postAttribution?.creatorNotes ||
            restaurant.editorialSummary) && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💡 INSIDER TIPS</Text>
              {postAttribution?.walkInTips ? (
                <View style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>🚪</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipBold}>Walk-in tip: </Text>
                    {postAttribution.walkInTips}
                  </Text>
                </View>
              ) : null}

              {postAttribution?.creatorNotes ? (
                <View style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>💬</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipBold}>Creator quote: </Text>"
                    {postAttribution.creatorNotes}"
                  </Text>
                </View>
              ) : null}

              {restaurant.editorialSummary && !postAttribution?.creatorNotes ? (
                <View style={styles.tipRow}>
                  <Text style={styles.tipEmoji}>📖</Text>
                  <Text style={styles.tipText}>
                    {restaurant.editorialSummary}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Guides Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🗺️ IN YOUR GUIDES</Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.primary();
                  setIsGuideModalVisible(true);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.editPillText}>+ Add to Guide</Text>
              </TouchableOpacity>
            </View>

            {guides && guides.length > 0 ? (
              <View style={styles.guidesGrid}>
                {guides.map((g) => (
                  <View key={g.id} style={styles.guideBadge}>
                    <Text style={styles.guideBadgeText}>
                      {g.emojiIcon} {g.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.unorganizedGuideText}>
                Not assigned to any guides yet. Add to a guide to organize your
                crumb trail!
              </Text>
            )}
          </View>

          {/* Personal Notes & Inline Editor */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📝 YOUR PERSONAL NOTES</Text>
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
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteCrumb}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Remove crumb"
            >
              <Text style={styles.deleteButtonText}>
                🗑️ Remove from My Crumbs
              </Text>
            </TouchableOpacity>
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
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
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
  locationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
    marginTop: 2,
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
  hoursIcon: {
    fontSize: 14,
  },
  hoursHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  hoursChevron: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  hoursDropdown: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.inputBorder,
    paddingTop: 8,
    gap: 4,
  },
  hoursRowText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  actionCapsuleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  actionCapsule: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
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
    width: '100%',
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    paddingVertical: 12,
    alignItems: 'center',
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
  heroDishBox: {
    backgroundColor: 'rgba(196, 91, 62, 0.08)',
    borderRadius: Theme.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 91, 62, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroDishName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  heroDishBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.pill,
    marginLeft: 8,
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
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.error,
  },
});
