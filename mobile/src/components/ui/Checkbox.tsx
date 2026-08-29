import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export interface CheckboxProps {
  checked: boolean;
  onToggle?: (checked: boolean) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onToggle,
  size = 26,
  style,
  accessibilityLabel,
}: CheckboxProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    haptics.selection();
    onToggle?.(!checked);
  };

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <TouchableOpacity
      style={[
        styles.circle,
        circleStyle,
        checked
          ? [
              styles.circleChecked,
              {
                backgroundColor: colors.primary,
                borderColor: colors.cardBackground,
              },
            ]
          : [
              styles.circleUnchecked,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
            ],
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      {checked ? (
        <Text style={[styles.checkmark, { color: colors.onPrimary }]}>✓</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  circleChecked: {
    borderWidth: 1.5,
  },
  circleUnchecked: {
    borderWidth: 1.5,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
});
