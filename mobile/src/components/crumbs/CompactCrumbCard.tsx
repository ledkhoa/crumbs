import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { StarRating, SocialPlatformIcon } from '@/components/ui';
import {
  ForkKnifeIcon,
  PlusIcon,
  WineIcon,
  NavigationArrowIcon,
  SparkleIcon,
} from 'phosphor-react-native';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface CompactCrumbCardProps {
  crumb: EnrichedUserCrumb;
  onPress: (crumb: EnrichedUserCrumb) => void;
  onAddToGuide: (crumb: EnrichedUserCrumb) => void;
  onBookOrMapPress: (crumb: EnrichedUserCrumb) => void;
  onDelete?: (crumb: EnrichedUserCrumb) => void;
}

export function CompactCrumbCard({
  crumb,
  onPress,
  onAddToGuide,
  onBookOrMapPress,
}: CompactCrumbCardProps) {
  const { restaurant, sourcePost, effectiveHeroDish, postAttribution } = crumb;

  const handleCardPress = () => {
    haptics.tap();
    onPress(crumb);
  };

  const handleGuidePress = () => {
    haptics.primary();
    onAddToGuide(crumb);
  };

  const handleBookOrMap = () => {
    haptics.tap();
    onBookOrMapPress(crumb);
  };

  const hasReservation = Boolean(
    restaurant.reservationUrl || restaurant.reservationProvider,
  );

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);

  const locationText =
    restaurant.city && restaurant.state
      ? `${restaurant.city}, ${restaurant.state}`
      : restaurant.formattedAddress || '';

  const creatorCredit = sourcePost?.authorUsername
    ? `@${sourcePost.authorUsername}`
    : null;

  const vibeTags = postAttribution?.vibeTags || [];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${locationText}`}
    >
      {/* Left 88x88 Image Column */}
      <View style={styles.imageContainer}>
        {restaurant.photoUrl ? (
          <Image
            source={{ uri: restaurant.photoUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ForkKnifeIcon size={32} color={Theme.colors.textSubtle} />
          </View>
        )}

        {/* Platform Watermark Badge */}
        {sourcePost?.platform && (
          <View style={styles.platformBadge}>
            <SocialPlatformIcon
              platform={sourcePost.platform}
              size={12}
              color={Theme.colors.text}
            />
          </View>
        )}
      </View>

      {/* Right Information Column */}
      <View style={styles.infoContainer}>
        {/* Row 1: Header (Title + Price/Rating) */}
        <View style={styles.headerRow}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.metaRight}>
            {formattedPrice ? (
              <Text style={styles.priceText}>{formattedPrice}</Text>
            ) : null}
            {formattedPrice && restaurant.rating ? (
              <Text style={styles.dotSeparator}>·</Text>
            ) : null}
            {restaurant.rating ? (
              <StarRating rating={restaurant.rating} size="sm" />
            ) : null}
          </View>
        </View>

        {/* Row 2: Location & Provenance */}
        <View style={styles.metaRow}>
          {locationText ? (
            <Text style={styles.locationText} numberOfLines={1}>
              {locationText}
            </Text>
          ) : null}
          {creatorCredit && locationText ? (
            <Text style={styles.dotSeparator}>·</Text>
          ) : null}
          {creatorCredit ? (
            <Text style={styles.creatorText} numberOfLines={1}>
              {creatorCredit}
            </Text>
          ) : null}
        </View>

        {/* Row 3: Hero Dish Callout */}
        <View style={styles.dishRow}>
          {effectiveHeroDish ? (
            <View style={styles.heroDishRow}>
              <SparkleIcon
                size={11}
                color={Theme.colors.primary}
                weight="fill"
              />
              <Text style={styles.heroDishText} numberOfLines={1}>
                {effectiveHeroDish}
              </Text>
            </View>
          ) : restaurant.cuisine ? (
            <View style={styles.cuisineRow}>
              <ForkKnifeIcon size={11} color={Theme.colors.textMuted} />
              <Text style={styles.cuisineText} numberOfLines={1}>
                {restaurant.cuisine}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Row 4: Vibe Tags & Mini-Action Buttons */}
        <View style={styles.bottomRow}>
          {/* Vibe Tags */}
          <View style={styles.tagsGroup}>
            {vibeTags.slice(0, 2).map((tag, idx) => (
              <View key={`${tag}-${idx}`} style={styles.vibeTagPill}>
                <Text style={styles.vibeTagText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsGroup}>
            <TouchableOpacity
              style={styles.guideMiniButton}
              onPress={handleGuidePress}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Add to Guide"
            >
              <PlusIcon
                size={10}
                color={Theme.colors.onPrimary}
                weight="bold"
              />
              <Text style={styles.guideMiniText}>Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookMiniButton,
                hasReservation && styles.bookMiniButtonActive,
              ]}
              onPress={handleBookOrMap}
              activeOpacity={0.8}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={
                hasReservation ? 'Book Reservation' : 'Open in Maps'
              }
            >
              {hasReservation ? (
                <>
                  <WineIcon size={11} color="#3B6B38" weight="fill" />
                  <Text style={styles.bookMiniTextActive}>Book</Text>
                </>
              ) : (
                <>
                  <NavigationArrowIcon
                    size={11}
                    color={Theme.colors.text}
                    weight="fill"
                  />
                  <Text style={styles.bookMiniText}>Map</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: 108,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  imageContainer: {
    width: 88,
    height: 88,
    borderRadius: Theme.radii.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Theme.colors.inputBackground,
  },
  image: {
    width: 88,
    height: 88,
  },
  imagePlaceholder: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  platformBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: Theme.radii.pill,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformEmoji: {
    fontSize: 10,
  },
  infoContainer: {
    flex: 1,
    marginLeft: Theme.spacing.sm + 2,
    justifyContent: 'space-between',
    height: 88,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  restaurantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '500',
    maxWidth: '55%',
  },
  dotSeparator: {
    fontSize: 10,
    color: Theme.colors.textSubtle,
  },
  creatorText: {
    fontSize: 11,
    color: Theme.colors.textSubtle,
    fontWeight: '600',
    flexShrink: 1,
  },
  dishRow: {
    justifyContent: 'center',
  },
  heroDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroDishText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primary,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  cuisineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cuisineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tagsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
  },
  vibeTagPill: {
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  vibeTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guideMiniButton: {
    flexDirection: 'row',
    height: 24,
    paddingHorizontal: 7,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  guideMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  bookMiniButton: {
    flexDirection: 'row',
    height: 24,
    paddingHorizontal: 7,
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bookMiniButtonActive: {
    backgroundColor: 'rgba(124, 144, 112, 0.15)',
    borderColor: 'rgba(124, 144, 112, 0.35)',
  },
  bookMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  bookMiniTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B6B38',
  },
});
