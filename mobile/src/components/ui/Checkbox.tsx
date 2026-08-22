import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';
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
        checked ? styles.circleChecked : styles.circleUnchecked,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
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
    backgroundColor: Theme.colors.primary,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBackground,
  },
  circleUnchecked: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  checkmark: {
    color: Theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
});
