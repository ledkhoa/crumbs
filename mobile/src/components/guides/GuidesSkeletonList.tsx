import { View, StyleSheet } from 'react-native';
import { Theme } from '@/theme/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';

/**
 * Individual skeleton placeholder matching GuideCard dimensions and visual hierarchy.
 */
export function GuideCardSkeleton() {
  return (
    <Card style={styles.card}>
      {/* Media Cover Visual Area Skeleton */}
      <View style={styles.mediaContainer}>
        <Skeleton
          width="100%"
          height={180}
          borderRadius={0}
          style={styles.mediaSkeleton}
        />
        {/* Floating Emoji Badge Skeleton */}
        <View style={styles.emojiBadgeWrapper}>
          <Skeleton width={36} height={28} borderRadius={Theme.radii.pill} />
        </View>
        {/* Crumb Count Pill Skeleton */}
        <View style={styles.crumbCountWrapper}>
          <Skeleton width={68} height={24} borderRadius={Theme.radii.pill} />
        </View>
      </View>

      {/* Guide Info Skeleton */}
      <CardContent style={styles.contentContainer}>
        <Skeleton
          width="60%"
          height={20}
          borderRadius={Theme.radii.sm}
          style={styles.titleSkeleton}
        />
        <Skeleton
          width="85%"
          height={14}
          borderRadius={Theme.radii.sm}
          style={styles.descriptionSkeleton}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Vertical stack of skeleton cards rendered during Guides tab initial loading state.
 */
export function GuidesSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <GuideCardSkeleton key={`guide-skeleton-${idx}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
  },
  card: {
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  mediaContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: Theme.colors.inputBackground,
    overflow: 'hidden',
  },
  mediaSkeleton: {
    width: '100%',
    height: '100%',
  },
  emojiBadgeWrapper: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    left: Theme.spacing.sm,
  },
  crumbCountWrapper: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
  },
  contentContainer: {
    padding: Theme.spacing.md,
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  descriptionSkeleton: {
    marginTop: 2,
  },
});
