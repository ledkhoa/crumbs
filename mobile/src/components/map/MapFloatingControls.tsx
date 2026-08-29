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
  bottomOffset?: number;
}

export function MapFloatingControls({
  onRecenterPress,
  onDecideNowPress,
  isLocating = false,
  bottomOffset = 160,
}: MapFloatingControlsProps) {
  const { colors } = useTheme();

  const handleRecenter = () => {
    haptics.selection();
    onRecenterPress();
  };

  const handleDecideNow = () => {
    onDecideNowPress();
  };

  return (
    <View
      style={[styles.container, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
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
          <NavigationArrowIcon size={20} color={colors.primary} weight="fill" />
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
    alignItems: 'flex-end',
    gap: Theme.spacing.sm,
    zIndex: 25,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    height: 42,
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
