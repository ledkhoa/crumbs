import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useCreateGuideMutation } from '@/hooks/useGuides';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Heading, MutedText } from '@/components/ui/Typography';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required').max(255),
  description: z.string().max(1000),
  emojiIcon: z.string().max(32),
  isPublic: z.boolean(),
});

export interface CreateGuideFormProps {
  onCancel: () => void;
  onSuccess?: (newGuide?: { id: string; name: string }) => void;
}

const EMOJI_OPTIONS = [
  '🗺️',
  '🍷',
  '🥐',
  '🍜',
  '🌴',
  '☕',
  '🍕',
  '🍣',
  '🍸',
  '🌮',
];

export function CreateGuideForm({ onCancel, onSuccess }: CreateGuideFormProps) {
  const { colors } = useTheme();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createMutation = useCreateGuideMutation();

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      emojiIcon: '🗺️',
      isPublic: false,
    },
    validators: {
      onSubmit: createGuideSchema,
    },
    onSubmit: async ({ value }) => {
      setErrorMsg(null);
      try {
        const response = await createMutation.mutateAsync({
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          emojiIcon: value.emojiIcon || '🗺️',
          isPublic: value.isPublic,
        });

        form.reset();
        onSuccess?.(response?.guide);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to create guide. Please try again.');
      }
    },
  });

  const handleCancel = () => {
    haptics.tap();
    setErrorMsg(null);
    form.reset();
    onCancel();
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={Platform.OS === 'ios' ? 48 : 24}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {/* Form Header */}
      <View style={styles.header}>
        <Heading style={styles.headerTitle}>Create New Guide</Heading>
        <MutedText style={styles.headerSubtitle}>
          Curate a list for date nights, trips, or weekend cravings.
        </MutedText>
      </View>

      {/* Submission Error Banner */}
      {errorMsg ? (
        <View
          style={[
            styles.errorContainer,
            {
              backgroundColor: colors.errorBackground,
              borderColor: colors.errorBorder,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      {/* Guide Name Field */}
      <form.Field name="name">
        {(field) => (
          <Input
            label="Guide Name *"
            placeholder='e.g., "SoHo Natural Wine Crawl"'
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors?.[0]?.message}
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
          />
        )}
      </form.Field>

      {/* Emoji Icon Picker */}
      <form.Field name="emojiIcon">
        {(field) => (
          <View style={styles.fieldSection}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Cover Emoji
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiList}
            >
              {EMOJI_OPTIONS.map((emoji) => {
                const isSelected = field.state.value === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiPill,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                      isSelected && [
                        styles.emojiPillSelected,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.cardBackground,
                        },
                      ],
                    ]}
                    onPress={() => {
                      haptics.selection();
                      field.handleChange(emoji);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Select emoji ${emoji}`}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </form.Field>

      {/* Description Field */}
      <form.Field name="description">
        {(field) => (
          <Textarea
            label="Description (Optional)"
            placeholder="A quick summary or vibe of this guide..."
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors?.[0]?.message}
            minHeight={72}
          />
        )}
      </form.Field>

      {/* Public / Community Toggle */}
      <form.Field name="isPublic">
        {(field) => (
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>
                Share with Community
              </Text>
              <MutedText style={styles.switchSubtitle}>
                Allow friends & followers to discover this guide
              </MutedText>
            </View>
            <Switch
              value={field.state.value}
              onValueChange={(val) => {
                haptics.selection();
                field.handleChange(val);
              }}
              trackColor={{
                false: colors.switchTrackOff,
                true: colors.primary,
              }}
              thumbColor={
                Platform.OS === 'android'
                  ? field.state.value
                    ? colors.onPrimary
                    : colors.switchThumbOff
                  : undefined
              }
              ios_backgroundColor={colors.switchTrackOff}
            />
          </View>
        )}
      </form.Field>

      {/* Actions */}
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <View style={styles.actionRow}>
            <Button
              variant="outline"
              size="lg"
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={isSubmitting || createMutation.isPending}
              disabled={!canSubmit}
              onPress={() => form.handleSubmit()}
              style={styles.submitButton}
            >
              Create Guide
            </Button>
          </View>
        )}
      </form.Subscribe>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    marginBottom: Theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  errorContainer: {
    borderWidth: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  fieldSection: {
    marginBottom: Theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  emojiList: {
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  emojiPill: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPillSelected: {
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 22,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
