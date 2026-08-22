import { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'primary'
  | 'hero'
  | 'accent'
  | 'success'
  | 'error'
  | 'outline';

export type BadgeCorner = 'pill' | 'rounded';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  corner?: BadgeCorner;
  size?: BadgeSize;
  icon?: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

export function Badge({
  variant = 'default',
  corner = 'pill',
  size = 'md',
  icon,
  label,
  style,
  textStyle,
  children,
}: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        styles[corner],
        styles[size],
        style,
      ]}
    >
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      {label ? (
        <Text
          style={[
            styles.textBase,
            styles[`${variant}Text`],
            styles[`${size}Text`],
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Corners
  pill: {
    borderRadius: Theme.radii.pill,
  },
  rounded: {
    borderRadius: Theme.radii.sm,
  },
  // Sizes
  sm: {
    paddingHorizontal: Theme.spacing.xs + 2,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 5,
  },
  // Variants
  default: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  secondary: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  hero: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  accent: {
    backgroundColor: 'rgba(223, 176, 100, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 100, 0.35)',
  },
  success: {
    backgroundColor: 'rgba(124, 144, 112, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 144, 112, 0.35)',
  },
  error: {
    backgroundColor: Theme.colors.errorBackground,
    borderWidth: 1,
    borderColor: Theme.colors.errorBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  // Text Styles
  textBase: {
    fontWeight: '600',
  },
  smText: {
    fontSize: 11,
  },
  mdText: {
    fontSize: 12,
  },
  defaultText: {
    color: Theme.colors.text,
  },
  secondaryText: {
    color: Theme.colors.text,
  },
  primaryText: {
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
  heroText: {
    color: Theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  accentText: {
    color: Theme.colors.accent,
    fontWeight: '700',
  },
  successText: {
    color: Theme.colors.success,
    fontWeight: '700',
  },
  errorText: {
    color: Theme.colors.error,
    fontWeight: '700',
  },
  outlineText: {
    color: Theme.colors.textMuted,
  },
});
