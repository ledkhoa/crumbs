import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useCreateGuideMutation } from '@/hooks/useGuides';

const createGuideSchema = z.object({
  name: z.string().min(1, 'Guide name is required').max(255),
  description: z.string().max(1000),
  emojiIcon: z.string().max(32),
  isPublic: z.boolean(),
});

interface CreateGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

export function CreateGuideModal({
  visible,
  onClose,
  onSuccess,
}: CreateGuideModalProps) {
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
        await createMutation.mutateAsync({
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          emojiIcon: value.emojiIcon || '🗺️',
          isPublic: value.isPublic,
        });

        form.reset();
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to create guide. Please try again.');
      }
    },
  });

  const handleClose = () => {
    haptics.tap();
    setErrorMsg(null);
    form.reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          Platform.OS !== 'ios' && styles.androidBackdrop,
        ]}
      >
        {Platform.OS !== 'ios' && (
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        )}

        <View style={styles.sheetContent}>
          {/* Grab Handle */}
          <View style={styles.grabHandle} />

          <KeyboardAwareScrollView
            bottomOffset={Platform.OS === 'ios' ? 48 : 24}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Modal Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create new guide</Text>
              <Text style={styles.headerSubtitle}>
                Curate a list for date nights, trips, or weekend cravings.
              </Text>
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
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Guide Name</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="e.g. West Village Date Nights, Tokyo 2026"
                      placeholderTextColor={Theme.colors.textMuted}
                      autoCapitalize="words"
                      style={styles.input}
                    />
                  </View>
                  {field.state.meta.errors[0] && (
                    <Text style={styles.fieldError}>
                      {field.state.meta.errors[0].message}
                    </Text>
                  )}
                </View>
              )}
            </form.Field>

            {/* Description Input */}
            <form.Field name="description">
              {(field) => (
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Description (Optional)</Text>
                  <View
                    style={[styles.inputContainer, styles.textAreaContainer]}
                  >
                    <TextInput
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="Short note about the vibe, neighborhood, or theme"
                      placeholderTextColor={Theme.colors.textMuted}
                      multiline
                      numberOfLines={3}
                      style={[styles.input, styles.textArea]}
                    />
                  </View>
                </View>
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
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      haptics.primary();
                      form.handleSubmit();
                    }}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={Theme.colors.onPrimary} />
                    ) : (
                      <Text style={styles.submitButtonText}>Create Guide</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </form.Subscribe>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  androidBackdrop: {
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
  },
  grabHandle: {
    width: 36,
    height: 5,
    backgroundColor: Theme.colors.textSubtle,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
    opacity: 0.7,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
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
  inputContainer: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 6,
  },
  textAreaContainer: {
    paddingVertical: Theme.spacing.sm,
    minHeight: 80,
  },
  input: {
    fontSize: 15,
    color: Theme.colors.text,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: Theme.colors.error,
    fontSize: 12,
    marginTop: Theme.spacing.xs,
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
  },
  switchSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: Theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  cancelButtonText: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    height: 50,
    borderRadius: Theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
