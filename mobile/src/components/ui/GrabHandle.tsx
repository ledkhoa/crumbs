import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Theme } from '@/theme/tokens';

export interface GrabHandleProps {
  style?: StyleProp<ViewStyle>;
}

export function GrabHandle({ style }: GrabHandleProps) {
  return <View style={[styles.handle, style]} />;
}

const styles = StyleSheet.create({
  handle: {
    width: 40,
    height: 5,
    backgroundColor: Theme.colors.grabHandle,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
});
