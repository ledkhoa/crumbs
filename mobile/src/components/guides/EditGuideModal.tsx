import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { AppKeyboardToolbar } from '@/components/ui/AppKeyboardToolbar';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  useUpdateGuideMutation,
  useDeleteGuideMutation,
} from '@/hooks/useGuides';
import { XIcon, TrashIcon } from 'phosphor-react-native';

const POPULAR_EMOJIS = [
  '🗺️',
  '🍷',
  '🍝',
  '🍣',
  '☕',
  '🌮',
  '🥐',
  '🍸',
  '🍰',
  '🍕',
  '🌿',
  '✨',
  '🍜',
  '🏖️',
  '🍔',
];

interface EditGuideModalProps {
  visible: boolean;
  guide: {
    id: string;
    name: string;
    description?: string | null;
    emojiIcon?: string | null;
    isPublic: boolean;
  };
  onClose: () => void;
  onDeleted?: () => void;
}

export function EditGuideModal({
  visible,
  guide,
  onClose,
  onDeleted,
}: EditGuideModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(guide.name);
  const [description, setDescription] = useState(guide.description || '');
  const [emojiIcon, setEmojiIcon] = useState(guide.emojiIcon || '🗺️');
  const [isPublic, setIsPublic] = useState(guide.isPublic);

  const updateMutation = useUpdateGuideMutation();
  const deleteMutation = useDeleteGuideMutation();

  useEffect(() => {
    if (visible) {
      setName(guide.name);
      setDescription(guide.description || '');
      setEmojiIcon(guide.emojiIcon || '🗺️');
      setIsPublic(guide.isPublic);
    }
  }, [visible, guide]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a guide name');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        guideId: guide.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          emojiIcon,
          isPublic,
        },
      });
      haptics.primary();
      onClose();
    } catch (err) {
      console.error('[EditGuideModal] Failed to update guide:', err);
      Alert.alert('Error', 'Failed to update guide. Please try again.');
    }
  };

  const handleDelete = () => {
    haptics.warning();
    Alert.alert(
      'Delete Guide',
      `Are you sure you want to delete "${guide.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(guide.id);
              haptics.primary();
              onClose();
              onDeleted?.();
            } catch (err) {
              console.error('[EditGuideModal] Failed to delete guide:', err);
              Alert.alert('Error', 'Failed to delete guide. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {Platform.OS !== 'ios' && (
          <Pressable style={styles.dismissOverlay} onPress={onClose} />
        )}
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          {/* Grab Handle */}
          <View
            style={[styles.grabHandle, { backgroundColor: colors.grabHandle }]}
          />

          {/* Header */}
          <View
            style={[styles.header, { borderBottomColor: colors.inputBorder }]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Edit Guide
            </Text>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: colors.inputBackground },
              ]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
            >
              <XIcon size={18} color={colors.text} weight="bold" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Emoji Selector */}
            <View style={styles.emojiSection}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Icon
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiScroll}
              >
                {POPULAR_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                      },
                      emojiIcon === emoji && [
                        styles.emojiButtonSelected,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.cardBackground,
                        },
                      ],
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setEmojiIcon(emoji);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select emoji ${emoji}`}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Guide Name */}
            <View style={styles.fieldWrapper}>
              <Input
                label="Guide Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. West Village Date Night"
                maxLength={60}
                autoCapitalize="words"
              />
            </View>

            {/* Description */}
            <View style={styles.fieldWrapper}>
              <Textarea
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="What makes this itinerary special?"
                maxLength={240}
                minHeight={80}
              />
            </View>

            {/* Public Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Public Guide
                </Text>
                <Text
                  style={[styles.switchSubtitle, { color: colors.textMuted }]}
                >
                  Allow anyone with the link to view and clone this guide
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={(val) => {
                  haptics.selection();
                  setIsPublic(val);
                }}
                trackColor={{
                  false: colors.switchTrackOff,
                  true: colors.primary,
                }}
                thumbColor={
                  Platform.OS === 'android'
                    ? isPublic
                      ? colors.onPrimary
                      : colors.switchThumbOff
                    : undefined
                }
                ios_backgroundColor={colors.switchTrackOff}
              />
            </View>

            {/* Form Actions: Side-by-side standard layout */}
            <View style={styles.actionRow}>
              <Button
                variant="outline"
                size="lg"
                onPress={onClose}
                style={styles.cancelButton}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="lg"
                loading={updateMutation.isPending}
                onPress={handleSave}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </View>

            {/* Destructive Action: Separated Danger Zone */}
            <View
              style={[
                styles.dangerZone,
                { borderTopColor: colors.inputBorder },
              ]}
            >
              <Button
                variant="ghost"
                size="md"
                onPress={handleDelete}
                loading={deleteMutation.isPending}
                leftIcon={
                  <TrashIcon size={16} color={colors.error} weight="bold" />
                }
                textStyle={[styles.deleteButtonText, { color: colors.error }]}
              >
                Delete Guide
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
        <AppKeyboardToolbar />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.45)',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    height: Platform.OS === 'ios' ? '100%' : '88%',
    paddingTop: 12,
    paddingHorizontal: Theme.spacing.lg,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
  },
  grabHandle: {
    width: 36,
    height: 5,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  closeButton: {
    padding: 6,
    borderRadius: Theme.radii.pill,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: Theme.spacing.xxl,
    gap: 16,
  },
  emojiSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  emojiScroll: {
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 22,
  },
  fieldWrapper: {
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
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
    marginTop: Theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  dangerZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
  },
  deleteButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
