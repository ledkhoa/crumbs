import { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';

export interface EmptyStateProps {
  emoji?: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  serifTitle?: boolean;
}

export function EmptyState({
  emoji,
  icon,
  title,
  description,
  action,
  style,
  serifTitle = true,
}: EmptyStateProps) {
  const hasIcon = Boolean(emoji || icon);

  return (
    <View style={[styles.container, style]}>
      {hasIcon && (
        <View style={styles.iconCircle}>
          {emoji ? <Text style={styles.emojiText}>{emoji}</Text> : icon}
        </View>
      )}
      <Text style={[styles.title, serifTitle && styles.serifTitle]}>
        {title}
      </Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  emojiText: {
    fontSize: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  description: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  actionContainer: {
    marginTop: Theme.spacing.xs,
  },
});
