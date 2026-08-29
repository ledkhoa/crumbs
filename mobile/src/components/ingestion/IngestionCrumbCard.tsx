import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { StarRating } from '@/components/ui/StarRating';
import {
  ForkKnifeIcon,
  SparkleIcon,
  LightbulbIcon,
} from 'phosphor-react-native';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

export interface IngestionCrumbCardProps {
  crumb: UnifiedRestaurantSpot;
  /** When true, renders a selection toggle in the top-right corner of the photo */
  selectable?: boolean;
  /** Selection state when in selectable mode */
  selected?: boolean;
  /** Callback when card or selection circle is pressed */
  onToggleSelect?: (crumb: UnifiedRestaurantSpot) => void;
  /** Optional custom width (e.g. for carousel slides) */
  cardWidth?: number;
}

export function IngestionCrumbCard({
  crumb,
  selectable = false,
  selected = false,
  onToggleSelect,
  cardWidth,
}: IngestionCrumbCardProps) {
  const handlePress = () => {
    if (selectable && onToggleSelect) {
      haptics.selection();
      onToggleSelect(crumb);
    }
  };

  const formattedPrice = formatPriceLevel(crumb.priceLevel);

  const locationParts = [
    crumb.neighborhood,
    crumb.city,
    crumb.state || crumb.country,
  ].filter(Boolean);
  const locationText =
    locationParts.length > 0
      ? locationParts.join(', ')
      : crumb.formattedAddress;

  const cardStyle = [
    styles.card,
    cardWidth ? { width: cardWidth } : null,
    selectable && !selected && styles.cardUnselected,
  ];

  const content = (
    <Card style={cardStyle}>
      {/* 16:9 Hero Photography */}
      <View style={styles.photoContainer}>
        {crumb.photoUrl ? (
          <Image
            source={{ uri: crumb.photoUrl }}
            style={styles.heroPhoto}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <ForkKnifeIcon size={36} color={Theme.colors.textSubtle} />
          </View>
        )}

        {/* Gradient Scrim */}
        <View style={styles.photoScrim} />

        {/* Subtle Selection Checkbox Pill (Multi-Crumb Mode) */}
        {selectable && (
          <View style={styles.checkboxWrapper}>
            <Checkbox
              checked={selected}
              onToggle={() => onToggleSelect?.(crumb)}
              accessibilityLabel={`${crumb.name} selection`}
            />
          </View>
        )}

        {/* Overlaid Hero Dish Pill */}
        {crumb.heroDish && (
          <Badge
            variant="hero"
            corner="pill"
            style={styles.heroDishPill}
            icon={
              <SparkleIcon
                size={12}
                color={Theme.colors.onPrimary}
                weight="fill"
              />
            }
            label={`MUST-ORDER: ${crumb.heroDish.toUpperCase()}`}
          />
        )}
      </View>

      {/* Crumb Details Body */}
      <CardContent style={styles.cardBody}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <CardTitle style={styles.restaurantTitle} numberOfLines={2}>
            {crumb.name}
          </CardTitle>
          {(formattedPrice || crumb.rating != null) && (
            <Badge
              variant="default"
              corner="rounded"
              style={styles.ratingBadge}
            >
              {formattedPrice && (
                <Text style={styles.priceText}>{formattedPrice}</Text>
              )}
              {formattedPrice && crumb.rating != null && (
                <Text style={styles.priceText}> · </Text>
              )}
              {crumb.rating != null ? (
                <StarRating rating={crumb.rating} size="sm" />
              ) : null}
            </Badge>
          )}
        </View>

        {/* Address / Neighborhood / City / State */}
        {locationText ? (
          <Text style={styles.addressText} numberOfLines={1}>
            {locationText}
          </Text>
        ) : null}

        {/* Vibe Anchor Quotation */}
        {crumb.vibeAnchor && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>“{crumb.vibeAnchor}”</Text>
          </View>
        )}

        {/* Vibe Tag Chips */}
        {crumb.vibeTags && crumb.vibeTags.length > 0 && (
          <View style={styles.vibeTagsRow}>
            {crumb.vibeTags.slice(0, 4).map((tag, idx) => (
              <Badge
                key={`${tag}-${idx}`}
                variant="default"
                corner="pill"
                label={tag}
                style={styles.vibeTagChip}
                textStyle={styles.vibeTagText}
              />
            ))}
          </View>
        )}

        {/* Tactical Walk-In Tip Callout */}
        {crumb.walkInTips && (
          <View style={styles.walkInBox}>
            <LightbulbIcon
              size={16}
              color={Theme.colors.accent}
              weight="fill"
            />
            <Text style={styles.walkInText}>
              <Text style={styles.walkInLabel}>Walk-in Tip: </Text>
              {crumb.walkInTips}
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );

  if (selectable) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${crumb.name}, ${selected ? 'selected' : 'unselected'}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  cardUnselected: {
    opacity: 0.6,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: Theme.colors.inputBackground,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.inputBackground,
  },
  photoPlaceholderEmoji: {
    fontSize: 40,
    opacity: 0.5,
  },
  photoScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  checkboxWrapper: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    zIndex: 10,
  },
  heroDishPill: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    left: Theme.spacing.sm,
    right: Theme.spacing.sm,
  },
  heroDishEmoji: {
    fontSize: 14,
    marginRight: 2,
  },
  cardBody: {
    padding: Theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: Theme.spacing.sm,
  },
  restaurantTitle: {
    flex: 1,
    fontSize: 20,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  addressText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.sm,
  },
  quoteContainer: {
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
    marginBottom: Theme.spacing.sm,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Theme.colors.text,
    lineHeight: 18,
  },
  vibeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Theme.spacing.sm,
  },
  vibeTagChip: {
    paddingVertical: 4,
  },
  vibeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  walkInBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(223, 176, 100, 0.12)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 100, 0.3)',
    marginTop: 2,
  },
  walkInIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  walkInText: {
    flex: 1,
    fontSize: 12,
    color: Theme.colors.text,
    lineHeight: 16,
  },
  walkInLabel: {
    fontWeight: '700',
    color: Theme.colors.primary,
  },
});
