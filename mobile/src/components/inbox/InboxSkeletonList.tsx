import { View, StyleSheet } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Individual skeleton placeholder matching CompactCrumbCard dimensions.
 */
export function CompactCrumbCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* Left 88x88 Image Skeleton */}
      <Skeleton
        width={88}
        height={88}
        borderRadius={Theme.radii.md}
        style={styles.image}
      />

      {/* Right Info Column */}
      <View style={styles.infoContainer}>
        {/* Row 1: Header (Title + Price/Rating) */}
        <View style={styles.headerRow}>
          <Skeleton width="55%" height={16} borderRadius={Theme.radii.sm} />
          <Skeleton width="22%" height={12} borderRadius={Theme.radii.sm} />
        </View>

        {/* Row 2: Location & Meta */}
        <View style={styles.metaRow}>
          <Skeleton width="45%" height={11} borderRadius={Theme.radii.sm} />
          <Skeleton width="30%" height={11} borderRadius={Theme.radii.sm} />
        </View>

        {/* Row 3: Hero Dish */}
        <View style={styles.dishRow}>
          <Skeleton width="70%" height={13} borderRadius={Theme.radii.sm} />
        </View>

        {/* Row 4: Vibe Tags & Mini-Actions */}
        <View style={styles.bottomRow}>
          <View style={styles.tagsGroup}>
            <Skeleton width={48} height={18} borderRadius={Theme.radii.pill} />
            <Skeleton width={58} height={18} borderRadius={Theme.radii.pill} />
          </View>
          <View style={styles.actionsGroup}>
            <Skeleton width={38} height={24} borderRadius={Theme.radii.pill} />
            <Skeleton width={48} height={24} borderRadius={Theme.radii.pill} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Vertical stack of skeleton cards rendered during Inbox tab loading states.
 */
export function InboxSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <CompactCrumbCardSkeleton key={`inbox-skeleton-${idx}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.xs,
  },
  card: {
    flexDirection: 'row',
    height: 108,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    alignItems: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  image: {
    width: 88,
    height: 88,
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
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dishRow: {
    justifyContent: 'center',
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
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
