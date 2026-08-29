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
import { Theme } from '@/theme/tokens';
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

    return crumbs.filter((c) => {
      const name = c.restaurant.name.toLowerCase();
      const location = (
        c.restaurant.formattedAddress ||
        c.restaurant.city ||
        ''
      ).toLowerCase();
      const dish = (c.effectiveHeroDish || '').toLowerCase();
      return name.includes(q) || location.includes(q) || dish.includes(q);
    });
  }, [crumbs, searchQuery]);

  const handleToggleSelect = (crumbId: string) => {
    if (existingSet.has(crumbId)) return;
    haptics.selection();
    setSelectedIds((prev) =>
      prev.includes(crumbId)
        ? prev.filter((id) => id !== crumbId)
        : [...prev, crumbId],
    );
  };

  const handleAdd = () => {
    if (selectedIds.length === 0) return;

    addMutation.mutate(
      {
        guideId,
        crumbIds: selectedIds,
      },
      {
        onSuccess: () => {
          setSelectedIds([]);
          onClose();
        },
      },
    );
  };

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

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Crumbs to Guide</Text>
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search saved crumbs..."
            />
          </View>

          {/* Crumbs List */}
          <FlatList
            data={filteredCrumbs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isExisting = existingSet.has(item.id);
              const isSelected = selectedIds.includes(item.id);
              const formattedPrice = formatPriceLevel(
                item.restaurant.priceLevel,
              );

              return (
                <TouchableOpacity
                  style={[
                    styles.crumbRow,
                    isExisting && styles.crumbRowDisabled,
                    isSelected && styles.crumbRowSelected,
                  ]}
                  onPress={() => handleToggleSelect(item.id)}
                  disabled={isExisting}
                  activeOpacity={0.7}
                >
                  {/* Thumbnail */}
                  {item.restaurant.photoUrl ? (
                    <Image
                      source={{ uri: item.restaurant.photoUrl }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <ForkKnifeIcon
                        size={18}
                        color={Theme.colors.textSubtle}
                        weight="bold"
                      />
                    </View>
                  )}

                  {/* Info */}
                  <View style={styles.crumbDetails}>
                    <Text style={styles.restaurantName} numberOfLines={1}>
                      {item.restaurant.name}
                    </Text>
                    <Text style={styles.subtitleText} numberOfLines={1}>
                      {formattedPrice ? `${formattedPrice} · ` : ''}
                      {item.restaurant.city || item.restaurant.formattedAddress}
                    </Text>
                    {item.effectiveHeroDish ? (
                      <View style={styles.heroDishPill}>
                        <SparkleIcon
                          size={10}
                          color={Theme.colors.primary}
                          weight="fill"
                        />
                        <Text style={styles.heroDishText} numberOfLines={1}>
                          {item.effectiveHeroDish}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right Checkbox / Status */}
                  {isExisting ? (
                    <Text style={styles.inGuideLabel}>Added</Text>
                  ) : (
                    <Checkbox
                      checked={isSelected}
                      onToggle={() => handleToggleSelect(item.id)}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Bottom Sticky Action */}
          <View style={styles.footer}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleAdd}
              disabled={selectedIds.length === 0}
              loading={addMutation.isPending}
              style={styles.addButton}
            >
              {selectedIds.length > 0
                ? `Add ${selectedIds.length} ${selectedIds.length === 1 ? 'Crumb' : 'Crumbs'} to Guide`
                : 'Select Crumbs to Add'}
            </Button>
          </View>
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
    paddingBottom: 12,
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
    backgroundColor: Theme.colors.cardBackground,
    padding: 10,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    gap: 12,
  },
  crumbRowSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(196, 91, 62, 0.04)',
  },
  crumbRowDisabled: {
    opacity: 0.5,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.inputBackground,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Theme.radii.sm,
    backgroundColor: Theme.colors.inputBackground,
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
    color: Theme.colors.text,
  },
  subtitleText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
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
    color: Theme.colors.primary,
  },
  inGuideLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.inputBorder,
  },
  addButton: {
    width: '100%',
  },
});
