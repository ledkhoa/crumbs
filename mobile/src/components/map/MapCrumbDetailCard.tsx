import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { getRestaurantOpenStatus } from '@/utils/opening-hours';
import {
  SparkleIcon,
  WineIcon,
  NavigationArrowIcon,
  FolderSimpleIcon,
  CaretRightIcon,
  XIcon,
  LightbulbIcon,
  ForkKnifeIcon,
  StarIcon,
} from 'phosphor-react-native';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface MapCrumbDetailCardProps {
  crumb: EnrichedUserCrumb;
  onPress: (crumb: EnrichedUserCrumb) => void;
  onAddToGuide: (crumb: EnrichedUserCrumb) => void;
  onBookOrMapPress: (crumb: EnrichedUserCrumb) => void;
  onClose: () => void;
}

export function MapCrumbDetailCard({
  crumb,
  onPress,
  onAddToGuide,
  onBookOrMapPress,
  onClose,
}: MapCrumbDetailCardProps) {
  const { colors } = useTheme();
  const { restaurant, sourcePost, postAttribution, guides } = crumb;

  // Resolve best image (restaurant photo, or first post media slide)
  const imageUrl =
    restaurant.photoUrl || sourcePost?.mediaUrls?.[0] || undefined;

  // Live Opening Hours Calculation
  const openStatus = useMemo(() => {
    return getRestaurantOpenStatus(restaurant.regularOpeningHours);
  }, [restaurant.regularOpeningHours]);

  const priceFormatted = formatPriceLevel(restaurant.priceLevel);

  // 3-Tier Effective Hero Dish Resolution
  const effectiveHeroDish =
    crumb.effectiveHeroDish ||
    crumb.userHeroDishOverride ||
    postAttribution?.heroDish ||
    restaurant.communityFavoriteDish ||
    null;

  // Vibe Tags
  const vibeTags = postAttribution?.vibeTags || [];
  const walkInTips = postAttribution?.walkInTips || null;

  const isBookable = Boolean(restaurant.reservationUrl);
  const providerName = restaurant.reservationProvider
    ? restaurant.reservationProvider.charAt(0).toUpperCase() +
      restaurant.reservationProvider.slice(1)
    : 'Table';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
        },
      ]}
    >
      {/* Top Header Row with Dismiss Action */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerLeftTouchable}
          onPress={() => {
            haptics.tap();
            onPress(crumb);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View full details for ${restaurant.name}`}
        >
          <Text
            style={[
              styles.restaurantName,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              },
            ]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          <CaretRightIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.closeButton,
            { backgroundColor: colors.inputBackground },
          ]}
          onPress={() => {
            haptics.tap();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close detail card"
        >
          <XIcon size={16} color={colors.textMuted} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Main Body Preview (Image + Meta Highlights) */}
      <View style={styles.heroSection}>
        {/* Photo Thumbnail */}
        <TouchableOpacity
          onPress={() => {
            haptics.tap();
            onPress(crumb);
          }}
          activeOpacity={0.85}
          style={styles.imageContainer}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <ForkKnifeIcon size={28} color={colors.textMuted} />
            </View>
          )}
        </TouchableOpacity>

        {/* Info Column */}
        <View style={styles.infoCol}>
          {/* Metadata Row: Rating, Price, Neighborhood */}
          <View style={styles.metaRow}>
            {restaurant.rating !== null && restaurant.rating !== undefined && (
              <View style={styles.ratingBadge}>
                <StarIcon size={12} color="#DFB064" weight="fill" />
                <Text style={[styles.ratingText, { color: colors.text }]}>
                  {restaurant.rating.toFixed(1)}
                </Text>
                {restaurant.userRatingCount && (
                  <Text
                    style={[
                      styles.ratingCountText,
                      { color: colors.textSubtle },
                    ]}
                  >
                    ({restaurant.userRatingCount})
                  </Text>
                )}
              </View>
            )}

            {Boolean(priceFormatted) && (
              <Text style={[styles.metaDotText, { color: colors.textSubtle }]}>
                ·
              </Text>
            )}

            {Boolean(priceFormatted) && (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {priceFormatted}
              </Text>
            )}

            {Boolean(restaurant.neighborhood || restaurant.city) && (
              <Text style={[styles.metaDotText, { color: colors.textSubtle }]}>
                ·
              </Text>
            )}

            {Boolean(restaurant.neighborhood || restaurant.city) && (
              <Text
                style={[styles.metaText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {restaurant.neighborhood || restaurant.city}
              </Text>
            )}
          </View>

          {/* Live Open / Closed Status */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: openStatus.isOpen
                    ? colors.success
                    : colors.textMuted,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: openStatus.isOpen ? colors.success : colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {openStatus.statusText}
            </Text>
          </View>

          {/* Cuisine Pill */}
          {Boolean(restaurant.cuisine) && (
            <View
              style={[
                styles.cuisinePill,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[styles.cuisineText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {restaurant.cuisine}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Hero Dish Highlight Pill */}
      {effectiveHeroDish && (
        <View
          style={[
            styles.heroDishHighlight,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <SparkleIcon size={14} color={colors.primary} weight="fill" />
          <Text style={[styles.heroDishLabel, { color: colors.primary }]}>
            Must order:
          </Text>
          <Text
            style={[styles.heroDishValue, { color: colors.text }]}
            numberOfLines={1}
          >
            {effectiveHeroDish}
          </Text>
        </View>
      )}

      {/* Walk-in Tips / Vibe Tags */}
      {(walkInTips || vibeTags.length > 0) && (
        <View style={styles.extrasRow}>
          {walkInTips ? (
            <View style={styles.walkInRow}>
              <LightbulbIcon size={13} color="#DFB064" weight="fill" />
              <Text
                style={[styles.walkInText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {walkInTips}
              </Text>
            </View>
          ) : null}

          {vibeTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vibeChipsContainer}
            >
              {vibeTags.slice(0, 4).map((tag, idx) => (
                <View
                  key={`${tag}-${idx}`}
                  style={[
                    styles.vibeChip,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.vibeChipText, { color: colors.text }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Guides Inclusion Badges */}
      {guides && guides.length > 0 && (
        <View style={styles.guidesBadgesRow}>
          <FolderSimpleIcon size={13} color={colors.textSubtle} weight="bold" />
          <Text style={[styles.guidesLabel, { color: colors.textSubtle }]}>
            In guides:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.guidesBadgesList}
          >
            {guides.map((g) => (
              <View
                key={g.id}
                style={[
                  styles.guideBadge,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.guideBadgeText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {g.emojiIcon} {g.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons Row: Reserve/Directions + Add to Guide + View Full Details */}
      <View style={styles.actionsRow}>
        {/* Primary CTA (Book Table / Directions) */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => onBookOrMapPress(crumb)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            isBookable
              ? `Book table on ${providerName}`
              : `Get directions to ${restaurant.name}`
          }
        >
          {isBookable ? (
            <WineIcon size={16} color={colors.onPrimary} weight="bold" />
          ) : (
            <NavigationArrowIcon
              size={16}
              color={colors.onPrimary}
              weight="fill"
            />
          )}
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
            {isBookable ? `Book ${providerName}` : 'Directions'}
          </Text>
        </TouchableOpacity>

        {/* Secondary CTA: Add to Guide */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => {
            haptics.tap();
            onAddToGuide(crumb);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add to guide"
        >
          <FolderSimpleIcon size={16} color={colors.text} weight="bold" />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Guides
          </Text>
        </TouchableOpacity>

        {/* Tertiary Link: Full Crumb Details */}
        <TouchableOpacity
          style={[
            styles.detailsLinkButton,
            {
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={() => {
            haptics.tap();
            onPress(crumb);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View full details"
        >
          <Text style={[styles.detailsLinkText, { color: colors.textMuted }]}>
            Details ›
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.md,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  restaurantName: {
    fontSize: 19,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: Theme.radii.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCountText: {
    fontSize: 11,
  },
  metaDotText: {
    marginHorizontal: 4,
    fontSize: 11,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cuisinePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    marginTop: 2,
  },
  cuisineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  heroDishHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    gap: 6,
  },
  heroDishLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroDishValue: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  extrasRow: {
    gap: 6,
  },
  walkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walkInText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  vibeChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vibeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
  },
  vibeChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  guidesBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guidesLabel: {
    fontSize: 11,
  },
  guidesBadgesList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    borderWidth: 1,
  },
  guideBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  primaryButton: {
    flex: 2,
    height: 38,
    borderRadius: Theme.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 38,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsLinkButton: {
    paddingHorizontal: 10,
    height: 38,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
