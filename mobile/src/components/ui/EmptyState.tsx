import { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';

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
  const { colors } = useTheme();
  const hasIcon = Boolean(emoji || icon);

  return (
    <View style={[styles.container, style]}>
      {hasIcon && (
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {emoji ? <Text style={styles.emojiText}>{emoji}</Text> : icon}
        </View>
      )}
      <Text
        style={[
          styles.title,
          { color: colors.text },
          serifTitle && styles.serifTitle,
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      )}
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  emojiText: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  serifTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: Theme.spacing.lg,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
