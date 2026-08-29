import { isValidElement, type ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
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
  const { colors } = useTheme();

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
        return colors.onPrimary;
      case 'secondary':
      case 'outline':
      case 'ghost':
      default:
        return colors.text;
    }
  };

  const getVariantContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.inputBackground,
          borderColor: colors.inputBorder,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.cardBorder,
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'destructive':
        return {
          backgroundColor: colors.error,
          shadowColor: colors.error,
        };
    }
  };

  const getVariantTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
      case 'destructive':
        return { color: colors.onPrimary };
      case 'secondary':
      case 'outline':
        return { color: colors.text };
      case 'ghost':
        return { color: colors.textMuted };
    }
  };

  const isCustomElement = isValidElement(children);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        getVariantContainerStyle(),
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
                styles[`${size}Text`],
                getVariantTextStyle(),
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
});
