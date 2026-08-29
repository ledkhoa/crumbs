import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { MapPinIcon, XIcon } from 'phosphor-react-native';
import type { LocationPermissionStatus } from '@/types/map';

export interface LocationPermissionBannerProps {
  status: LocationPermissionStatus;
  onRequestPermission: () => void;
  onDismiss: () => void;
}

export function LocationPermissionBanner({
  status,
  onRequestPermission,
  onDismiss,
}: LocationPermissionBannerProps) {
  const { colors } = useTheme();

  if (status === 'granted' || status === 'undetermined') {
    return null;
  }

  const handleEnable = () => {
    haptics.tap();
    onRequestPermission();
  };

  const handleDismiss = () => {
    haptics.selection();
    onDismiss();
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bannerCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <MapPinIcon size={16} color={colors.primary} weight="fill" />
        <Text
          style={[styles.messageText, { color: colors.text }]}
          numberOfLines={1}
        >
          Showing NYC · Enable location to see nearby cravings
        </Text>

        <TouchableOpacity
          style={[styles.enableButton, { backgroundColor: colors.primary }]}
          onPress={handleEnable}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enable location permission"
        >
          <Text style={[styles.enableButtonText, { color: colors.onPrimary }]}>
            Enable
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss location notice"
          style={styles.closeButton}
        >
          <XIcon size={14} color={colors.textSubtle} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
    zIndex: 15,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  enableButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radii.pill,
  },
  enableButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    padding: 2,
  },
});
