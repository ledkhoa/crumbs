import { View, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
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
  const { colors } = useTheme();

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

          <CreateGuideForm onCancel={handleClose} onSuccess={onSuccess} />
        </View>
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
    paddingHorizontal: Theme.spacing.lg,
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
});
