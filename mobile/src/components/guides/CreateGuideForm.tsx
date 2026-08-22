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
import { Theme } from '@/theme/tokens';
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

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Emoji Selector */}
      <form.Field name="emojiIcon">
        {(field) => (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Icon</Text>
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
                      isSelected && styles.emojiPillSelected,
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

      {/* Guide Name Input */}
      <form.Field name="name">
        {(field) => (
          <Input
            label="Guide Name"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChangeText={field.handleChange}
            placeholder="e.g. West Village Date Nights, Tokyo 2026"
            autoCapitalize="words"
            error={field.state.meta.errors[0]?.message}
          />
        )}
      </form.Field>

      {/* Description Input */}
      <form.Field name="description">
        {(field) => (
          <Textarea
            label="Description (Optional)"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChangeText={field.handleChange}
            placeholder="Short note about the vibe, neighborhood, or theme"
            numberOfLines={3}
          />
        )}
      </form.Field>

      {/* Public Switch */}
      <form.Field name="isPublic">
        {(field) => (
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Public Guide</Text>
              <Text style={styles.switchSubtitle}>
                Anyone with the link can view and save your guide
              </Text>
            </View>
            <Switch
              value={field.state.value}
              onValueChange={(val) => {
                haptics.selection();
                field.handleChange(val);
              }}
              trackColor={{
                false: Theme.colors.switchTrackOff,
                true: Theme.colors.primary,
              }}
              thumbColor={
                Platform.OS === 'android'
                  ? field.state.value
                    ? Theme.colors.onPrimary
                    : Theme.colors.switchThumbOff
                  : Theme.colors.onPrimary
              }
              ios_backgroundColor={Theme.colors.switchTrackOff}
            />
          </View>
        )}
      </form.Field>

      {/* Action Buttons */}
      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isSubmitting }) => (
          <View style={styles.actionRow}>
            <Button
              variant="secondary"
              size="lg"
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="lg"
              style={styles.submitButton}
              onPress={() => form.handleSubmit()}
              loading={isSubmitting}
              disabled={isSubmitting}
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
    backgroundColor: Theme.colors.errorBackground,
    borderColor: Theme.colors.errorBorder,
    borderWidth: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  fieldSection: {
    marginBottom: Theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPillSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.cardBackground,
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
    color: Theme.colors.text,
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
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
