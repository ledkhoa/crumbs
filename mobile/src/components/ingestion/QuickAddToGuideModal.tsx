import { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { GuidePickerView } from './GuidePickerView';
import { CreateGuideModal } from '@/components/guides/CreateGuideModal';

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
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const handleClose = () => {
    haptics.tap();
    onClose();
  };

  const effectiveCrumbIds =
    crumbIds && crumbIds.length > 0 ? crumbIds : crumbId ? [crumbId] : [];

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={
          Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'
        }
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

            <GuidePickerView
              restaurantName={restaurantName}
              crumbIds={effectiveCrumbIds}
              onBack={handleClose}
              onSelectGuide={async (guideId) => {
                await onGuideSelected(guideId);
                onClose();
              }}
              onOpenCreateGuide={() => setCreateModalVisible(true)}
            />

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel guide selection"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Embedded Create Guide Modal */}
      <CreateGuideModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={async (newGuide) => {
          setCreateModalVisible(false);
          if (newGuide?.id) {
            await onGuideSelected(newGuide.id);
            onClose();
          }
        }}
      />
    </>
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
    paddingTop: Theme.spacing.md,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
  },
  grabHandle: {
    width: 36,
    height: 5,
    backgroundColor: Theme.colors.grabHandle,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
    opacity: 0.7,
  },
  cancelButton: {
    height: 48,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
  },
});
