import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';

export interface GrabHandleProps {
  style?: StyleProp<ViewStyle>;
}

export function GrabHandle({ style }: GrabHandleProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.handle, { backgroundColor: colors.grabHandle }, style]}
    />
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 40,
    height: 5,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
});
