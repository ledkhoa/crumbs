import { useState } from 'react';
import { View, StyleSheet, Modal, Platform, Pressable } from 'react-native';
import { AppKeyboardToolbar } from '@/components/ui/AppKeyboardToolbar';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { GuidePickerView } from './GuidePickerView';
import { CreateGuideForm } from '@/components/guides/CreateGuideForm';
import { Button } from '@/components/ui/Button';

export interface QuickAddToGuideModalProps {
  visible: boolean;
  restaurantName?: string;
  crumbId?: string;
  crumbIds?: string[];
  onClose: () => void;
  onGuideSelected: (guideId: string) => Promise<void> | void;
}

export function QuickAddToGuideModal({
  visible,
  restaurantName,
  crumbId,
  crumbIds,
  onClose,
  onGuideSelected,
}: QuickAddToGuideModalProps) {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<'picker' | 'create'>('picker');

  const handleClose = () => {
    haptics.tap();
    setViewMode('picker');
    onClose();
  };

  const effectiveCrumbIds =
    crumbIds && crumbIds.length > 0 ? crumbIds : crumbId ? [crumbId] : [];

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
          { backgroundColor: colors.background },
          Platform.OS !== 'ios' && styles.androidBackdrop,
        ]}
      >
        {Platform.OS !== 'ios' && (
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        )}

        <View
          style={[styles.sheetContent, { backgroundColor: colors.background }]}
        >
          {/* Grab Handle */}
          <View
            style={[styles.grabHandle, { backgroundColor: colors.grabHandle }]}
          />

          {viewMode === 'picker' ? (
            <>
              <GuidePickerView
                restaurantName={restaurantName}
                crumbIds={effectiveCrumbIds}
                onBack={handleClose}
                onSelectGuide={async (guideId) => {
                  await onGuideSelected(guideId);
                  handleClose();
                }}
                onOpenCreateGuide={() => {
                  haptics.primary();
                  setViewMode('create');
                }}
              />

              {/* Cancel Button */}
              <View style={styles.cancelButtonContainer}>
                <Button
                  variant="outline"
                  size="md"
                  onPress={handleClose}
                  accessibilityLabel="Cancel guide selection"
                >
                  Cancel
                </Button>
              </View>
            </>
          ) : (
            <View style={styles.createGuideContainer}>
              <CreateGuideForm
                onCancel={() => setViewMode('picker')}
                onSuccess={async (newGuide) => {
                  if (newGuide?.id) {
                    await onGuideSelected(newGuide.id);
                    handleClose();
                  } else {
                    setViewMode('picker');
                  }
                }}
              />
            </View>
          )}
        </View>
        <AppKeyboardToolbar />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: Theme.spacing.md,
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
  cancelButtonContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.lg,
  },
  createGuideContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
});
