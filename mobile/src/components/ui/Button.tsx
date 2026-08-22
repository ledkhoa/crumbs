import { isValidElement, type ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type TouchableOpacityProps,
} from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  haptic?: 'primary' | 'tap' | 'selection' | 'none';
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  haptic,
  style,
  textStyle,
  children,
  onPress,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (disabled || loading) return;

    const defaultHaptic =
      variant === 'primary' || variant === 'destructive' ? 'primary' : 'tap';
    const effectiveHaptic = haptic ?? defaultHaptic;

    if (effectiveHaptic === 'primary') {
      haptics.primary();
    } else if (effectiveHaptic === 'tap') {
      haptics.tap();
    } else if (effectiveHaptic === 'selection') {
      haptics.selection();
    }

    onPress?.(e);
  };

  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
      case 'destructive':
        return Theme.colors.onPrimary;
      case 'secondary':
      case 'outline':
      case 'ghost':
      default:
        return Theme.colors.text;
    }
  };

  const isCustomElement = isValidElement(children);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          {isCustomElement ? (
            children
          ) : (
            <Text
              style={[
                styles.textBase,
                styles[`${variant}Text`],
                styles[`${size}Text`],
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radii.lg,
    gap: Theme.spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  // Sizes
  sm: {
    height: 36,
    paddingHorizontal: Theme.spacing.md,
  },
  md: {
    height: 46,
    paddingHorizontal: Theme.spacing.lg,
  },
  lg: {
    height: 52,
    paddingHorizontal: Theme.spacing.xl,
  },
  icon: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
  },
  // Variants
  primary: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  secondary: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Theme.colors.error,
    shadowColor: Theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  // Text Styles
  textBase: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconText: {
    fontSize: 16,
  },
  primaryText: {
    color: Theme.colors.onPrimary,
  },
  secondaryText: {
    color: Theme.colors.text,
  },
  outlineText: {
    color: Theme.colors.text,
  },
  ghostText: {
    color: Theme.colors.textMuted,
  },
  destructiveText: {
    color: Theme.colors.onPrimary,
  },
});
