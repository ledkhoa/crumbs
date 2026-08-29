import {
  Text as RNText,
  StyleSheet,
  Platform,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';

export interface TypographyProps extends RNTextProps {
  style?: StyleProp<TextStyle>;
}

export function Heading({ style, children, ...props }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText style={[styles.heading, { color: colors.text }, style]} {...props}>
      {children}
    </RNText>
  );
}

export function Subheading({ style, children, ...props }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[styles.subheading, { color: colors.text }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export function Text({ style, children, ...props }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText style={[styles.text, { color: colors.text }, style]} {...props}>
      {children}
    </RNText>
  );
}

export function MutedText({ style, children, ...props }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[styles.mutedText, { color: colors.textMuted }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export function Label({ style, children, ...props }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText style={[styles.label, { color: colors.text }, style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    fontSize: 24,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
  },
  text: {
    fontSize: 14,
  },
  mutedText: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
});
