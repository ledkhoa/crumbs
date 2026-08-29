import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
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
  const { restaurant, effectiveHeroDish } = item;

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const locationSubtitle = [restaurant.neighborhood, restaurant.city]
    .filter(Boolean)
    .join(', ');

  const openStatus = useMemo(() => {
    // SAFETY: Server-resolved restaurant regularOpeningHours conforms to OpeningHoursInfo schema
    const hours = restaurant.regularOpeningHours as
      OpeningHoursInfo | null | undefined;
    return getRestaurantOpenStatus(hours);
  }, [restaurant.regularOpeningHours]);

  return (
    <TouchableOpacity
      style={styles.card}
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
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <ForkKnifeIcon
              size={22}
              color={Theme.colors.textSubtle}
              weight="bold"
            />
          </View>
        )}

        {/* Details */}
        <View style={styles.detailsColumn}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant.name}
          </Text>

          {/* Subtitle Row (Price + Location + Open Status) */}
          <View style={styles.metaRow}>
            {formattedPrice ? (
              <Text style={styles.metaText}>{formattedPrice} · </Text>
            ) : null}
            {locationSubtitle ? (
              <Text
                style={[styles.metaText, styles.locationText]}
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
                      : styles.openStatusDotClosed,
                  ]}
                />
                <Text
                  style={[
                    styles.openStatusText,
                    openStatus.isOpen
                      ? styles.openStatusTextOpen
                      : styles.openStatusTextClosed,
                  ]}
                  numberOfLines={1}
                >
                  {openStatus.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Must-Order Hero Dish Pill */}
          {effectiveHeroDish ? (
            <View style={styles.heroDishPill}>
              <SparkleIcon
                size={11}
                color={Theme.colors.primary}
                weight="fill"
              />
              <Text style={styles.heroDishText} numberOfLines={1}>
                The Must-Order:{' '}
                <Text style={styles.heroDishHighlight}>
                  {effectiveHeroDish}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right Action / Chevron */}
        <View style={styles.rightActionColumn}>
          {onRemove ? (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                haptics.selection();
                onRemove(item.crumbId);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${restaurant.name} from guide`}
            >
              <TrashIcon
                size={16}
                color={Theme.colors.textSubtle}
                weight="bold"
              />
            </TouchableOpacity>
          ) : (
            <CaretRightIcon
              size={16}
              color={Theme.colors.textSubtle}
              weight="bold"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: 12,
    marginBottom: 10,
    shadowColor: Theme.colors.shadow,
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
    backgroundColor: Theme.colors.inputBackground,
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Theme.radii.md,
    backgroundColor: Theme.colors.inputBackground,
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
    fontFamily: 'Georgia',
    color: Theme.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
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
  openStatusDotClosed: {
    backgroundColor: Theme.colors.textSubtle,
  },
  openStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  openStatusTextOpen: {
    color: '#3B6B38',
  },
  openStatusTextClosed: {
    color: Theme.colors.textSubtle,
  },
  heroDishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(196, 91, 62, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Theme.radii.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  heroDishText: {
    fontSize: 11,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  heroDishHighlight: {
    fontWeight: '800',
  },
  rightActionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  removeButton: {
    padding: 6,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.inputBackground,
  },
});
