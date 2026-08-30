import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { formatPriceLevel } from '@/utils/price';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { useCrumbsQuery } from '@/hooks/useCrumbs';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { XIcon, ForkKnifeIcon, SparkleIcon } from 'phosphor-react-native';

interface AddCrumbsToGuideModalProps {
  visible: boolean;
  guideId: string;
  existingCrumbIds: string[];
  onClose: () => void;
}

export function AddCrumbsToGuideModal({
  visible,
  guideId,
  existingCrumbIds,
  onClose,
}: AddCrumbsToGuideModalProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data } = useCrumbsQuery();
  const crumbs = data?.crumbs || [];
  const addMutation = useAddCrumbToGuideMutation();

  const existingSet = useMemo(
    () => new Set(existingCrumbIds),
    [existingCrumbIds],
  );

  const filteredCrumbs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return crumbs;
    return crumbs.filter(
      (c) =>
        c.restaurant.name.toLowerCase().includes(q) ||
        c.restaurant.city?.toLowerCase().includes(q) ||
        c.restaurant.formattedAddress?.toLowerCase().includes(q) ||
        c.effectiveHeroDish?.toLowerCase().includes(q),
    );
  }, [crumbs, searchQuery]);

  const handleToggleCrumb = (crumbId: string) => {
    if (existingSet.has(crumbId)) return;
    haptics.selection();
    setSelectedIds((prev) =>
      prev.includes(crumbId)
        ? prev.filter((id) => id !== crumbId)
        : [...prev, crumbId],
    );
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await addMutation.mutateAsync({
        guideId,
        crumbIds: selectedIds,
      });
      haptics.primary();
      setSelectedIds([]);
      onClose();
    } catch (err) {
      console.error('[AddCrumbsToGuideModal] Failed to add crumbs:', err);
    }
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Add Crumbs to Guide
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

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your crumbs..."
            />
          </View>

          {/* List of Crumbs */}
          <FlatList
            data={filteredCrumbs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isAlreadyInGuide = existingSet.has(item.id);
              const isSelected = selectedIds.includes(item.id);
              const formattedPrice = formatPriceLevel(
                item.restaurant.priceLevel,
              );
              const locationText = [item.restaurant.city, item.restaurant.state]
                .filter(Boolean)
                .join(', ');

              return (
                <TouchableOpacity
                  style={[
                    styles.crumbRow,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.cardBorder,
                    },
                    isSelected && [
                      styles.crumbRowSelected,
                      { borderColor: colors.primary },
                    ],
                    isAlreadyInGuide && styles.crumbRowDisabled,
                  ]}
                  onPress={() => handleToggleCrumb(item.id)}
                  disabled={isAlreadyInGuide}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.restaurant.name}${isAlreadyInGuide ? ', already in guide' : ''}`}
                >
                  {/* Thumbnail */}
                  {item.restaurant.photoUrl ? (
                    <Image
                      source={{ uri: item.restaurant.photoUrl }}
                      style={[
                        styles.thumbnail,
                        { backgroundColor: colors.inputBackground },
                      ]}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View
                      style={[
                        styles.thumbnailPlaceholder,
                        { backgroundColor: colors.inputBackground },
                      ]}
                    >
                      <ForkKnifeIcon
                        size={18}
                        color={colors.textSubtle}
                        weight="bold"
                      />
                    </View>
                  )}

                  {/* Details */}
                  <View style={styles.crumbDetails}>
                    <Text
                      style={[styles.restaurantName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.restaurant.name}
                    </Text>
                    {(formattedPrice || locationText) && (
                      <Text
                        style={[
                          styles.subtitleText,
                          { color: colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {[formattedPrice, locationText]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                    {item.effectiveHeroDish && (
                      <View style={styles.heroDishPill}>
                        <SparkleIcon
                          size={10}
                          color={colors.primary}
                          weight="fill"
                        />
                        <Text
                          style={[
                            styles.heroDishText,
                            { color: colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.effectiveHeroDish}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Selection Indicator */}
                  {isAlreadyInGuide ? (
                    <Text
                      style={[
                        styles.inGuideLabel,
                        { color: colors.textSubtle },
                      ]}
                    >
                      In Guide
                    </Text>
                  ) : (
                    <Checkbox
                      checked={isSelected}
                      onToggle={() => handleToggleCrumb(item.id)}
                      size={24}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.inputBorder }]}>
            <Button
              variant="primary"
              size="lg"
              disabled={selectedIds.length === 0}
              loading={addMutation.isPending}
              onPress={handleAddSelected}
              style={styles.addButton}
            >
              Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} to
              Guide
            </Button>
          </View>
        </View>
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
    paddingBottom: 12,
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
  searchContainer: {
    paddingBottom: 10,
  },
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },
  crumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    gap: 12,
  },
  crumbRowSelected: {
    backgroundColor: 'rgba(196, 91, 62, 0.04)',
  },
  crumbRowDisabled: {
    opacity: 0.5,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Theme.radii.sm,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crumbDetails: {
    flex: 1,
    gap: 2,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
  },
  heroDishPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  heroDishText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inGuideLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
  },
  addButton: {
    width: '100%',
  },
});
