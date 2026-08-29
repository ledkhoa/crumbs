import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { SparkleIcon, CompassIcon } from 'phosphor-react-native';

export interface MapEmptyStateOverlayProps {
  type: 'no_saved_crumbs_global' | 'no_crumbs_in_viewport';
  totalSavedCount?: number;
  onFitAllCrumbs?: () => void;
  onAddCrumb?: () => void;
  topOffset?: number;
}

export function MapEmptyStateOverlay({
  type,
  totalSavedCount = 0,
  onFitAllCrumbs,
  onAddCrumb,
  topOffset,
}: MapEmptyStateOverlayProps) {
  const { colors } = useTheme();

  if (type === 'no_crumbs_in_viewport') {
    if (totalSavedCount === 0) return null;

    const handleZoomAll = () => {
      haptics.primary();
      onFitAllCrumbs?.();
    };

    return (
      <View
        style={[
          styles.viewportBannerContainer,
          topOffset !== undefined && { top: topOffset },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.viewportBanner,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <CompassIcon size={16} color={colors.primary} weight="fill" />
          <Text
            style={[styles.viewportBannerText, { color: colors.text }]}
            numberOfLines={1}
          >
            No saved cravings in this area
          </Text>

          <TouchableOpacity
            style={[styles.fitButton, { backgroundColor: colors.primary }]}
            onPress={handleZoomAll}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Zoom to all ${totalSavedCount} saved cravings`}
          >
            <Text style={[styles.fitButtonText, { color: colors.onPrimary }]}>
              View All ({totalSavedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Global Empty State (Brand new user with zero crumbs)
  const handleAddCrumbPress = () => {
    haptics.primary();
    onAddCrumb?.();
  };

  return (
    <View style={styles.globalContainer} pointerEvents="box-none">
      <View
        style={[
          styles.globalCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <SparkleIcon size={32} color={colors.primary} weight="fill" />
        </View>

        <Text
          style={[
            styles.globalTitle,
            {
              color: colors.text,
              fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
            },
          ]}
        >
          Your Cravings Map is Fresh
        </Text>

        <Text style={[styles.globalSubtitle, { color: colors.textMuted }]}>
          Share food videos from Instagram & TikTok to watch your personal city
          guide come alive.
        </Text>

        {onAddCrumb && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleAddCrumbPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add first crumb"
          >
            <Text
              style={[styles.actionButtonText, { color: colors.onPrimary }]}
            >
              Add First Crumb
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewportBannerContainer: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 22,
  },
  viewportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '90%',
  },
  viewportBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fitButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.pill,
  },
  fitButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  globalContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    zIndex: 25,
  },
  globalCard: {
    width: '100%',
    maxWidth: 340,
    padding: Theme.spacing.xl,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  globalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  globalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.radii.pill,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
