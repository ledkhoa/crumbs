import {
  Text as RNText,
  StyleSheet,
  Platform,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';

export interface TypographyProps extends RNTextProps {
  style?: StyleProp<TextStyle>;
}

export function Heading({ style, children, ...props }: TypographyProps) {
  return (
    <RNText style={[styles.heading, style]} {...props}>
      {children}
    </RNText>
  );
}

export function Subheading({ style, children, ...props }: TypographyProps) {
  return (
    <RNText style={[styles.subheading, style]} {...props}>
      {children}
    </RNText>
  );
}

export function Text({ style, children, ...props }: TypographyProps) {
  return (
    <RNText style={[styles.text, style]} {...props}>
      {children}
    </RNText>
  );
}

export function MutedText({ style, children, ...props }: TypographyProps) {
  return (
    <RNText style={[styles.mutedText, style]} {...props}>
      {children}
    </RNText>
  );
}

export function Label({ style, children, ...props }: TypographyProps) {
  return (
    <RNText style={[styles.label, style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    fontSize: 24,
    color: Theme.colors.text,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  text: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  mutedText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
});
