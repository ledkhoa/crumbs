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
import { Theme } from '@/theme/tokens';
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
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.cardBase, styles[variant], style]}
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
    <View style={[styles.cardBase, styles[variant], style]}>{children}</View>
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
  return (
    <Text
      style={[styles.title, serif && styles.serifTitle, style]}
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
  return (
    <Text style={[styles.description, style]} numberOfLines={numberOfLines}>
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
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.xl,
    borderWidth: 1.5,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
  },
  default: {
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  flat: {
    borderWidth: 0,
    backgroundColor: Theme.colors.inputBackground,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  header: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textMuted,
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
