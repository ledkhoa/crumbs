import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export interface IngestionErrorStateProps {
  type: 'unrelated' | 'error';
  errorMessage?: string | null;
  captionSnippet?: string | null;
  onRetry?: () => void;
  onSearchManually: () => void;
  onDismiss: () => void;
}

export function IngestionErrorState({
  type,
  errorMessage,
  captionSnippet,
  onRetry,
  onSearchManually,
  onDismiss,
}: IngestionErrorStateProps) {
  useEffect(() => {
    haptics.error();
  }, []);

  const isUnrelated = type === 'unrelated';

  const handleRetry = () => {
    haptics.primary();
    onRetry?.();
  };

  const handleSearchManually = () => {
    haptics.tap();
    onSearchManually();
  };

  const handleDismiss = () => {
    haptics.tap();
    onDismiss();
  };

  return (
    <View style={styles.container}>
      {/* Icon Badge */}
      <View
        style={[
          styles.iconCircle,
          isUnrelated ? styles.iconCircleUnrelated : styles.iconCircleError,
        ]}
      >
        <Text style={styles.iconEmoji}>{isUnrelated ? '🌴' : '🍞'}</Text>
      </View>

      {/* Header Info */}
      <Text style={styles.title}>
        {isUnrelated ? 'Scenic Post Detected 🌴' : "Couldn't Capture Crumb 🍞"}
      </Text>

      <Text style={styles.description}>
        {isUnrelated
          ? "We analyzed this post, but couldn't pinpoint a specific restaurant or food crumb."
          : errorMessage ||
            'Instagram rate limit or temporary network hiccup. Would you like to retry or add manually?'}
      </Text>

      {/* Caption Preview if available */}
      {captionSnippet && (
        <View style={styles.captionBox}>
          <Text style={styles.captionLabel}>Shared caption:</Text>
          <Text style={styles.captionText} numberOfLines={3}>
            “{captionSnippet}”
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        {!isUnrelated && onRetry && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>🔄 Try Ingesting Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={isUnrelated ? styles.primaryButton : styles.secondaryButton}
          onPress={handleSearchManually}
          activeOpacity={0.85}
        >
          <Text
            style={
              isUnrelated
                ? styles.primaryButtonText
                : styles.secondaryButtonText
            }
          >
            🔍 Search Place Manually
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
  },
  iconCircleUnrelated: {
    backgroundColor: Theme.colors.inputBackground,
    borderColor: Theme.colors.inputBorder,
  },
  iconCircleError: {
    backgroundColor: Theme.colors.errorBackground,
    borderColor: Theme.colors.errorBorder,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  captionBox: {
    width: '100%',
    backgroundColor: Theme.colors.inputBackground,
    borderColor: Theme.colors.cardBorder,
    borderWidth: 1,
    borderRadius: Theme.radii.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  captionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSubtle,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  captionText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  buttonGroup: {
    width: '100%',
    gap: Theme.spacing.sm,
  },
  primaryButton: {
    height: 52,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: Theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
