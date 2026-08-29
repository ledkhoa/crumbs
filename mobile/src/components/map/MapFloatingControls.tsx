import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { NavigationArrowIcon, SparkleIcon } from 'phosphor-react-native';

export interface MapFloatingControlsProps {
  onRecenterPress: () => void;
  onDecideNowPress: () => void;
  isLocating?: boolean;
}

export function MapFloatingControls({
  onRecenterPress,
  onDecideNowPress,
  isLocating = false,
}: MapFloatingControlsProps) {
  const { colors } = useTheme();

  const handleRecenter = () => {
    haptics.selection();
    onRecenterPress();
  };

  const handleDecideNow = () => {
    // Rolling haptic sequence handled by caller or initiated here
    haptics.primary();
    onDecideNowPress();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* My Location Floating Glass Button */}
      <TouchableOpacity
        style={[
          styles.recenterButton,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={handleRecenter}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Recenter to my location"
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <NavigationArrowIcon size={22} color={colors.primary} weight="fill" />
        )}
      </TouchableOpacity>

      {/* Decide Now Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.decideButton,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handleDecideNow}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Decide a craving for me"
      >
        <SparkleIcon size={18} color={colors.onPrimary} weight="fill" />
        <Text style={[styles.decideText, { color: colors.onPrimary }]}>
          Decide Now
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Theme.spacing.md,
    bottom: 120, // Positioned directly above carousel
    alignItems: 'flex-end',
    gap: Theme.spacing.sm,
    zIndex: 30,
  },
  recenterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  decideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Theme.radii.pill,
    gap: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  decideText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
