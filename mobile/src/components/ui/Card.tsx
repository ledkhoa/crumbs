import { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type TouchableOpacityProps,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type CardVariant = 'default' | 'flat' | 'outline';

export interface CardProps extends TouchableOpacityProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  style,
  children,
  onPress,
  ...props
}: CardProps) {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: colors.inputBackground,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.cardBorder,
          borderWidth: 1,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          borderWidth: 1.5,
          shadowColor: colors.shadow,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.cardBase, getVariantStyle(), style]}
        onPress={(e) => {
          haptics.tap();
          onPress(e);
        }}
        activeOpacity={0.88}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardBase, getVariantStyle(), style]}>{children}</View>
  );
}

export interface CardHeaderProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function CardHeader({ style, children }: CardHeaderProps) {
  return <View style={[styles.header, style]}>{children}</View>;
}

export interface CardTitleProps {
  serif?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: ReactNode;
}

export function CardTitle({
  serif = true,
  style,
  numberOfLines,
  children,
}: CardTitleProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.title,
        { color: colors.text },
        serif && styles.serifTitle,
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

export interface CardDescriptionProps {
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: ReactNode;
}

export function CardDescription({
  style,
  numberOfLines,
  children,
}: CardDescriptionProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.description, { color: colors.textMuted }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

export interface CardContentProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function CardContent({ style, children }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export interface CardFooterProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function CardFooter({ style, children }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: Theme.radii.xl,
    overflow: 'hidden',
  },
  header: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  content: {
    padding: Theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    paddingTop: 0,
  },
});
