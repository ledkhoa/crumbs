import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { SparkleIcon } from 'phosphor-react-native';

export interface MapEmptyStateOverlayProps {
  type?: 'no_saved_crumbs_global';
  onAddCrumb?: () => void;
}

export function MapEmptyStateOverlay({
  onAddCrumb,
}: MapEmptyStateOverlayProps) {
  const { colors } = useTheme();

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
