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
    <View style={cardStyle}>
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
            <Text style={styles.photoPlaceholderEmoji}>🍽️</Text>
          </View>
        )}

        {/* Gradient Scrim */}
        <View style={styles.photoScrim} />

        {/* Subtle Selection Checkbox Pill (Multi-Crumb Mode) */}
        {selectable && (
          <View style={styles.checkboxWrapper}>
            <View
              style={[
                styles.checkboxCircle,
                selected
                  ? styles.checkboxCircleSelected
                  : styles.checkboxCircleUnselected,
              ]}
            >
              {selected ? (
                <Text style={styles.checkboxCheckmark}>✓</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Overlaid Hero Dish Pill */}
        {crumb.heroDish && (
          <View style={styles.heroDishPill}>
            <Text style={styles.heroDishEmoji}>🍝</Text>
            <Text style={styles.heroDishText} numberOfLines={1}>
              MUST-ORDER: {crumb.heroDish.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Crumb Details Body */}
      <View style={styles.cardBody}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <Text style={styles.restaurantTitle} numberOfLines={2}>
            {crumb.name}
          </Text>
          {(formattedPrice || crumb.rating != null) && (
            <View style={styles.ratingBadge}>
              {formattedPrice && (
                <Text style={styles.priceText}>{formattedPrice} · </Text>
              )}
              {crumb.rating != null ? (
                <Text style={styles.ratingText}>
                  {crumb.rating.toFixed(1)} ★
                </Text>
              ) : null}
            </View>
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
              <View key={`${tag}-${idx}`} style={styles.vibeTagChip}>
                <Text style={styles.vibeTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tactical Walk-In Tip Callout */}
        {crumb.walkInTips && (
          <View style={styles.walkInBox}>
            <Text style={styles.walkInIcon}>💡</Text>
            <Text style={styles.walkInText}>
              <Text style={styles.walkInLabel}>Walk-in Tip: </Text>
              {crumb.walkInTips}
            </Text>
          </View>
        )}
      </View>
    </View>
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
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.xl,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
  checkboxCircle: {
    width: 26,
    height: 26,
    borderRadius: Theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  checkboxCircleSelected: {
    backgroundColor: Theme.colors.primary,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBackground,
  },
  checkboxCircleUnselected: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  checkboxCheckmark: {
    color: Theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  heroDishPill: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    left: Theme.spacing.sm,
    right: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  heroDishEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  heroDishText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.3,
    flex: 1,
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
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radii.sm,
    marginTop: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textMuted,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.accent,
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
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  vibeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.text,
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
