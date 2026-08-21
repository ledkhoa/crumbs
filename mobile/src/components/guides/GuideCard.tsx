import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

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
  const handlePress = () => {
    haptics.tap();
    onPress?.(guide);
  };

  const thumbnails = guide.coverThumbnails || [];
  const hasCoverImage = Boolean(guide.coverImageUrl);
  const count = hasCoverImage ? 1 : thumbnails.length;
  const extraCount = thumbnails.length > 4 ? thumbnails.length - 4 : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.88}
    >
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
        <View style={styles.emojiBadge}>
          <Text style={styles.emojiText}>{guide.emojiIcon || '🗺️'}</Text>
        </View>

        {/* Spot Count Pill */}
        <View style={styles.spotCountPill}>
          <Text style={styles.spotCountText}>
            {guide.crumbCount} {guide.crumbCount === 1 ? 'crumb' : 'crumbs'}
          </Text>
        </View>
      </View>

      {/* Guide Info */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {guide.name}
        </Text>
        {guide.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {guide.description}
          </Text>
        ) : (
          <Text style={styles.metaPlaceholder}>
            {guide.isPublic ? 'Public guide' : 'Personal guide'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.xl,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBorder,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiText: {
    fontSize: 16,
  },
  spotCountPill: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spotCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  contentContainer: {
    padding: Theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    lineHeight: 20,
  },
  metaPlaceholder: {
    fontSize: 13,
    color: Theme.colors.textSubtle,
  },
});
