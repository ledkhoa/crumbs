import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Typography';
import {
  WarningCircleIcon,
  CompassIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
} from 'phosphor-react-native';

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
  const { colors } = useTheme();

  useEffect(() => {
    haptics.error();
  }, []);

  const isUnrelated = type === 'unrelated';

  return (
    <View style={styles.container}>
      {/* Icon Badge */}
      <View
        style={[
          styles.iconCircle,
          isUnrelated
            ? {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              }
            : {
                backgroundColor: colors.errorBackground,
                borderColor: colors.errorBorder,
              },
        ]}
      >
        {isUnrelated ? (
          <CompassIcon size={32} color={colors.textMuted} weight="bold" />
        ) : (
          <WarningCircleIcon size={32} color={colors.error} weight="fill" />
        )}
      </View>

      {/* Header Info */}
      <Heading style={styles.title}>
        {isUnrelated ? 'No Restaurant Detected' : "Couldn't Capture Crumb"}
      </Heading>

      <Text style={[styles.description, { color: colors.textMuted }]}>
        {isUnrelated
          ? "We analyzed this post, but couldn't pinpoint a specific restaurant or food crumb."
          : errorMessage ||
            'Instagram rate limit or temporary network hiccup. Would you like to retry or add manually?'}
      </Text>

      {/* Caption Preview if available */}
      {captionSnippet && (
        <View
          style={[
            styles.captionBox,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.captionLabel, { color: colors.textSubtle }]}>
            Shared caption:
          </Text>
          <Text
            style={[styles.captionText, { color: colors.textMuted }]}
            numberOfLines={3}
          >
            “{captionSnippet}”
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        {!isUnrelated && onRetry && (
          <Button
            variant="primary"
            size="lg"
            onPress={onRetry}
            leftIcon={
              <ArrowClockwiseIcon
                size={18}
                color={colors.onPrimary}
                weight="bold"
              />
            }
          >
            Try Ingesting Again
          </Button>
        )}

        <Button
          variant={isUnrelated ? 'primary' : 'secondary'}
          size={isUnrelated ? 'lg' : 'md'}
          onPress={onSearchManually}
          leftIcon={
            <MagnifyingGlassIcon
              size={18}
              color={isUnrelated ? colors.onPrimary : colors.text}
              weight="bold"
            />
          }
        >
          Search Place Manually
        </Button>

        <Button variant="ghost" size="sm" onPress={onDismiss}>
          Dismiss
        </Button>
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
  title: {
    fontSize: 22,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  captionBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Theme.radii.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  captionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  captionText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  buttonGroup: {
    width: '100%',
    gap: Theme.spacing.sm,
  },
});
