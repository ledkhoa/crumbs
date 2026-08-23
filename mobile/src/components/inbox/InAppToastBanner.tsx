import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Image } from 'expo-image';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import type { UnifiedRestaurantSpot } from '@/types/ingest';
import type { InAppToastPayload } from '@/store/inbox';

export interface InAppToastBannerProps {
  toast: InAppToastPayload | null;
  onDismiss: () => void;
  onAddToGuide: (restaurant: UnifiedRestaurantSpot) => void;
  onViewInInbox: (restaurant: UnifiedRestaurantSpot) => void;
}

export function InAppToastBanner({
  toast,
  onDismiss,
  onAddToGuide,
  onViewInInbox,
}: InAppToastBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-140);

  useEffect(() => {
    if (toast) {
      haptics.success();
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

      const timer = setTimeout(() => {
        handleDismiss();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-140, { duration: 250 });
    }
  }, [toast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleDismiss = () => {
    haptics.tap();
    translateY.value = withTiming(-140, { duration: 200 }, (finished) => {
      if (finished) {
        scheduleOnRN(onDismiss);
      }
    });
  };

  const handleBannerPress = () => {
    if (toast) {
      haptics.tap();
      onViewInInbox(toast.restaurant);
      handleDismiss();
    }
  };

  const handleGuidePress = () => {
    if (toast) {
      haptics.primary();
      onAddToGuide(toast.restaurant);
      handleDismiss();
    }
  };

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + (Platform.OS === 'ios' ? 6 : 12) },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.contentRow}
        onPress={handleBannerPress}
        activeOpacity={0.9}
      >
        {/* Left 44x44 Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {toast.restaurant.photoUrl ? (
            <Image
              source={{ uri: toast.restaurant.photoUrl }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailEmoji}>🍽️</Text>
            </View>
          )}
          <View style={styles.breadBadge}>
            <Text style={styles.breadEmoji}>🍞</Text>
          </View>
        </View>

        {/* Center Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.statusLabel}>Captured to Inbox! 🌿</Text>
          <Text style={styles.title} numberOfLines={1}>
            {toast.restaurant.name}
          </Text>
          {toast.restaurant.heroDish ? (
            <Text style={styles.heroDish} numberOfLines={1}>
              Must-Order: {toast.restaurant.heroDish}
            </Text>
          ) : (
            <Text style={styles.meta} numberOfLines={1}>
              {toast.restaurant.neighborhood ||
                toast.restaurant.formattedAddress}
            </Text>
          )}
        </View>

        {/* Right Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.guideButton}
            onPress={handleGuidePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add crumb to guide"
          >
            <Text style={styles.guideButtonText}>🗺️ Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss banner"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    zIndex: 9999,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    padding: Theme.spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.md,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.md,
    backgroundColor: Theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 20,
  },
  breadBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.pill,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  breadEmoji: {
    fontSize: 9,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: Theme.spacing.sm + 2,
    marginRight: Theme.spacing.xs,
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.success,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    lineHeight: 18,
  },
  heroDish: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  meta: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  guideButton: {
    height: 30,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
});
