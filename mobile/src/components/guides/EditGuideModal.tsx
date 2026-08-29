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
import { Theme } from '@/theme/tokens';
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
  const [name, setName] = useState(guide.name);
  const [description, setDescription] = useState(guide.description || '');
  const [emojiIcon, setEmojiIcon] = useState(guide.emojiIcon || '🗺️');
  const [isPublic, setIsPublic] = useState(guide.isPublic);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateGuideMutation();
  const deleteMutation = useDeleteGuideMutation();

  useEffect(() => {
    setName(guide.name);
    setDescription(guide.description || '');
    setEmojiIcon(guide.emojiIcon || '🗺️');
    setIsPublic(guide.isPublic);
    setError(null);
  }, [guide, visible]);

  const handleClose = () => {
    haptics.tap();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      haptics.error();
      setError('Guide name is required');
      return;
    }

    updateMutation.mutate(
      {
        guideId: guide.id,
        input: {
          name: name.trim(),
          description: description.trim() || null,
          emojiIcon,
          isPublic,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setError(err.message || 'Failed to update guide');
        },
      },
    );
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
          onPress: () => {
            deleteMutation.mutate(guide.id, {
              onSuccess: () => {
                onClose();
                onDeleted?.();
              },
            });
          },
        },
      ],
    );
  };

  const isWorking = updateMutation.isPending || deleteMutation.isPending;

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

          {/* Modal Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Guide</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <XIcon size={20} color={Theme.colors.textMuted} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Emoji Selector */}
            <View style={styles.emojiSection}>
              <Text style={styles.fieldLabel}>Icon</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiScroll}
              >
                {POPULAR_EMOJIS.map((emoji) => {
                  const isSelected = emojiIcon === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiButton,
                        isSelected && styles.emojiButtonSelected,
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setEmojiIcon(emoji);
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

            {/* Name Input */}
            <View style={styles.fieldWrapper}>
              <Input
                label="Guide Name"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (error) setError(null);
                }}
                placeholder="e.g. Soho Date Nights, Paris 2026"
                error={error || undefined}
                maxLength={100}
                autoCapitalize="words"
              />
            </View>

            {/* Description Input */}
            <View style={styles.fieldWrapper}>
              <Textarea
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Short note about the vibe, neighborhood, or theme"
                maxLength={500}
                numberOfLines={3}
              />
            </View>

            {/* Public / Private Toggle (Uniform unboxed switch row) */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Public Guide</Text>
                <Text style={styles.switchSubtitle}>
                  Anyone with the link can view and save your guide
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={(val) => {
                  haptics.selection();
                  setIsPublic(val);
                }}
                trackColor={{
                  false: Theme.colors.switchTrackOff,
                  true: Theme.colors.primary,
                }}
                thumbColor={
                  Platform.OS === 'android'
                    ? isPublic
                      ? Theme.colors.onPrimary
                      : Theme.colors.switchThumbOff
                    : Theme.colors.onPrimary
                }
                ios_backgroundColor={Theme.colors.switchTrackOff}
              />
            </View>

            {/* Action Buttons: Side-by-side Cancel and Save */}
            <View style={styles.actionRow}>
              <Button
                variant="secondary"
                size="lg"
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isWorking}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="lg"
                style={styles.saveButton}
                onPress={handleSave}
                loading={updateMutation.isPending}
                disabled={isWorking}
              >
                Save Changes
              </Button>
            </View>

            {/* Accessible Destructive Delete Action (Separated Ghost Button) */}
            <View style={styles.dangerZone}>
              <Button
                variant="ghost"
                size="md"
                onPress={handleDelete}
                loading={deleteMutation.isPending}
                disabled={isWorking}
                leftIcon={
                  <TrashIcon
                    size={16}
                    color={Theme.colors.error}
                    weight="bold"
                  />
                }
                textStyle={styles.deleteButtonText}
                accessibilityRole="button"
                accessibilityLabel="Delete guide"
              >
                Delete Guide
              </Button>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.inputBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: Theme.colors.text,
  },
  closeButton: {
    padding: 6,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.inputBackground,
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
    color: Theme.colors.text,
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
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.cardBackground,
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
    borderTopColor: Theme.colors.inputBorder,
  },
  deleteButtonText: {
    color: Theme.colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
});
