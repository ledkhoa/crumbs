import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { getRestaurantOpenStatus } from '@/utils/opening-hours';
import type { OpeningHoursInfo } from '@/types/ingest';
import {
  CaretRightIcon,
  TrashIcon,
  SparkleIcon,
  ForkKnifeIcon,
} from 'phosphor-react-native';

export interface GuideCrumbItemData {
  crumbId: string;
  orderIndex: number;
  status: string;
  userNotes?: string | null;
  userHeroDishOverride?: string | null;
  effectiveHeroDish?: string | null;
  restaurant: {
    id: string;
    name: string;
    photoUrl?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    formattedAddress?: string | null;
    priceLevel?: string | null;
    rating?: string | number | null;
    regularOpeningHours?: unknown;
  };
  attribution?: {
    creatorUsername?: string | null;
    vibeAnchor?: string | null;
    courseCategory?: string | null;
    walkInTips?: string | null;
    vibeTags?: string[];
    sourcePostUrl?: string | null;
  } | null;
}

interface GuideCrumbCardProps {
  item: GuideCrumbItemData;
  onPress: (crumbId: string) => void;
  onRemove?: (crumbId: string) => void;
}

export function GuideCrumbCard({
  item,
  onPress,
  onRemove,
}: GuideCrumbCardProps) {
  const { colors } = useTheme();
  const { restaurant, effectiveHeroDish } = item;

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const locationSubtitle =
    [restaurant.neighborhood, restaurant.city].filter(Boolean).join(', ') ||
    restaurant.formattedAddress ||
    '';

  const openStatus = useMemo(() => {
    // SAFETY: Server-resolved restaurant regularOpeningHours conforms to OpeningHoursInfo schema
    const hours = restaurant.regularOpeningHours as
      OpeningHoursInfo | null | undefined;
    return getRestaurantOpenStatus(hours);
  }, [restaurant.regularOpeningHours]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          shadowColor: colors.shadow,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => {
        haptics.tap();
        onPress(item.crumbId);
      }}
      accessibilityRole="button"
      accessibilityLabel={restaurant.name}
    >
      <View style={styles.cardContentRow}>
        {/* Thumbnail */}
        {restaurant.photoUrl ? (
          <Image
            source={{ uri: restaurant.photoUrl }}
            style={[
              styles.thumbnail,
              { backgroundColor: colors.inputBackground },
            ]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            <ForkKnifeIcon size={22} color={colors.textSubtle} weight="bold" />
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsColumn}>
          <Text
            style={[styles.restaurantName, { color: colors.text }]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>

          {/* Subtitle Row (Price + Location + Open Status) */}
          <View style={styles.metaRow}>
            {formattedPrice ? (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {formattedPrice} ·{' '}
              </Text>
            ) : null}
            {locationSubtitle ? (
              <Text
                style={[
                  styles.metaText,
                  styles.locationText,
                  { color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {locationSubtitle}
              </Text>
            ) : null}
            {openStatus.statusText ? (
              <View style={styles.openStatusBadge}>
                <View
                  style={[
                    styles.openStatusDot,
                    openStatus.isOpen
                      ? styles.openStatusDotOpen
                      : { backgroundColor: colors.textSubtle },
                  ]}
                />
                <Text
                  style={[
                    styles.openStatusText,
                    openStatus.isOpen
                      ? styles.openStatusTextOpen
                      : { color: colors.textSubtle },
                  ]}
                  numberOfLines={1}
                >
                  {openStatus.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Must-Order Hero Dish */}
          {effectiveHeroDish ? (
            <View style={styles.heroDishRow}>
              <SparkleIcon size={12} color={colors.primary} weight="fill" />
              <Text
                style={[styles.heroDishText, { color: colors.text }]}
                numberOfLines={1}
              >
                <Text style={[styles.heroDishLabel, { color: colors.primary }]}>
                  Must-order:{' '}
                </Text>
                {effectiveHeroDish}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right Action / Chevron */}
        <View style={styles.rightActionColumn}>
          {onRemove ? (
            <TouchableOpacity
              style={[
                styles.removeButton,
                { backgroundColor: colors.inputBackground },
              ]}
              onPress={() => {
                haptics.selection();
                onRemove(item.crumbId);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${restaurant.name} from guide`}
            >
              <TrashIcon size={16} color={colors.textSubtle} weight="bold" />
            </TouchableOpacity>
          ) : (
            <CaretRightIcon size={16} color={colors.textSubtle} weight="bold" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: Theme.radii.md,
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsColumn: {
    flex: 1,
    gap: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationText: {
    flexShrink: 1,
    marginRight: 6,
  },
  openStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  openStatusDotOpen: {
    backgroundColor: '#3B6B38',
  },
  openStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  openStatusTextOpen: {
    color: '#3B6B38',
  },
  heroDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroDishText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  heroDishLabel: {
    fontWeight: '700',
  },
  rightActionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: Theme.radii.pill,
  },
});
