import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface GuideSummary {
  id: string;
  name: string;
  description?: string | null;
  emojiIcon?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
  crumbCount: number;
  coverThumbnails?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface GuideCardProps {
  guide: GuideSummary;
  onPress?: (guide: GuideSummary) => void;
}

export function GuideCard({ guide, onPress }: GuideCardProps) {
  const thumbnails = guide.coverThumbnails || [];
  const hasCoverImage = Boolean(guide.coverImageUrl);
  const count = hasCoverImage ? 1 : thumbnails.length;
  const extraCount = thumbnails.length > 4 ? thumbnails.length - 4 : 0;

  return (
    <Card style={styles.card} onPress={() => onPress?.(guide)}>
      {/* Dynamic Cover Visual Area */}
      <View style={styles.mediaContainer}>
        {hasCoverImage ? (
          <Image
            source={{ uri: guide.coverImageUrl! }}
            style={styles.fullMedia}
            contentFit="cover"
            transition={200}
          />
        ) : count === 0 ? (
          /* 0 Images: Decorative Pattern with Central Emoji */
          <View style={styles.placeholderPattern}>
            <Text style={styles.placeholderEmoji}>
              {guide.emojiIcon || '🗺️'}
            </Text>
          </View>
        ) : count === 1 ? (
          /* 1 Image: Full Hero Image */
          <Image
            source={{ uri: thumbnails[0] }}
            style={styles.fullMedia}
            contentFit="cover"
            transition={200}
          />
        ) : count === 2 ? (
          /* 2 Images: 50/50 Side-by-Side Split */
          <View style={styles.splitTwoContainer}>
            <Image
              source={{ uri: thumbnails[0] }}
              style={styles.splitTwoItem}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.verticalDivider} />
            <Image
              source={{ uri: thumbnails[1] }}
              style={styles.splitTwoItem}
              contentFit="cover"
              transition={200}
            />
          </View>
        ) : count === 3 ? (
          /* 3 Images: 60/40 Magazine Collage (Large Left Hero + 2 Stacked Right) */
          <View style={styles.splitThreeContainer}>
            <Image
              source={{ uri: thumbnails[0] }}
              style={styles.splitThreeHero}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.verticalDivider} />
            <View style={styles.splitThreeStack}>
              <Image
                source={{ uri: thumbnails[1] }}
                style={styles.splitThreeStackItem}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.horizontalDivider} />
              <Image
                source={{ uri: thumbnails[2] }}
                style={styles.splitThreeStackItem}
                contentFit="cover"
                transition={200}
              />
            </View>
          </View>
        ) : (
          /* 4+ Images: 2x2 Grid with Optional +N Overlay */
          <View style={styles.gridFourContainer}>
            <View style={styles.gridRow}>
              <Image
                source={{ uri: thumbnails[0] }}
                style={styles.gridItem}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.verticalDivider} />
              <Image
                source={{ uri: thumbnails[1] }}
                style={styles.gridItem}
                contentFit="cover"
                transition={200}
              />
            </View>
            <View style={styles.horizontalDivider} />
            <View style={styles.gridRow}>
              <Image
                source={{ uri: thumbnails[2] }}
                style={styles.gridItem}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.verticalDivider} />
              <View style={styles.gridItemWrapper}>
                <Image
                  source={{ uri: thumbnails[3] }}
                  style={styles.gridItem}
                  contentFit="cover"
                  transition={200}
                />
                {extraCount > 0 && (
                  <View style={styles.extraBadgeOverlay}>
                    <Text style={styles.extraBadgeText}>+{extraCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Floating Emoji Badge */}
        <Badge
          variant="secondary"
          corner="pill"
          style={styles.emojiBadge}
          label={guide.emojiIcon || '🗺️'}
          textStyle={styles.emojiText}
        />

        {/* Crumb Count Pill */}
        <Badge
          variant="secondary"
          corner="pill"
          style={styles.crumbCountPill}
          label={`${guide.crumbCount} ${guide.crumbCount === 1 ? 'crumb' : 'crumbs'}`}
        />
      </View>

      {/* Guide Info */}
      <CardContent style={styles.contentContainer}>
        <CardTitle numberOfLines={1}>{guide.name}</CardTitle>
        {guide.description ? (
          <CardDescription numberOfLines={2}>
            {guide.description}
          </CardDescription>
        ) : (
          <Text style={styles.metaPlaceholder}>
            {guide.isPublic ? 'Public guide' : 'Personal guide'}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Theme.spacing.md,
  },
  mediaContainer: {
    height: 180,
    width: '100%',
    backgroundColor: Theme.colors.inputBackground,
    position: 'relative',
    overflow: 'hidden',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  placeholderPattern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
  },
  placeholderEmoji: {
    fontSize: 52,
    opacity: 0.65,
  },
  // 2 Images Layout
  splitTwoContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitTwoItem: {
    flex: 1,
    height: '100%',
  },
  // 3 Images Layout
  splitThreeContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitThreeHero: {
    flex: 3,
    height: '100%',
  },
  splitThreeStack: {
    flex: 2,
    flexDirection: 'column',
  },
  splitThreeStackItem: {
    flex: 1,
    width: '100%',
  },
  // 4+ Images Grid Layout
  gridFourContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
    height: '100%',
  },
  gridItemWrapper: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  extraBadgeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30, 25, 21, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraBadgeText: {
    color: Theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Dividers
  verticalDivider: {
    width: 2,
    height: '100%',
    backgroundColor: Theme.colors.cardBackground,
  },
  horizontalDivider: {
    height: 2,
    width: '100%',
    backgroundColor: Theme.colors.cardBackground,
  },
  // Floating Badges
  emojiBadge: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    left: Theme.spacing.sm,
  },
  emojiText: {
    fontSize: 16,
  },
  crumbCountPill: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
  },
  contentContainer: {
    padding: Theme.spacing.md,
  },
  metaPlaceholder: {
    fontSize: 13,
    color: Theme.colors.textSubtle,
    marginTop: 2,
  },
});
