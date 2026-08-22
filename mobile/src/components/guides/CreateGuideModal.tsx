import { View, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { CreateGuideForm } from './CreateGuideForm';

export interface CreateGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newGuide?: { id: string; name: string }) => void;
}

export function CreateGuideModal({
  visible,
  onClose,
  onSuccess,
}: CreateGuideModalProps) {
  const handleClose = () => {
    haptics.tap();
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

          <CreateGuideForm onCancel={handleClose} onSuccess={onSuccess} />
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
});
