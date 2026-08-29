import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { SearchInput } from '@/components/ui/SearchInput';
import { CaretDownIcon, CheckIcon, XIcon } from 'phosphor-react-native';
import type { MapQuickFilter } from '@/types/map';
import type { GuideSummary } from '@/hooks/useMapCrumbs';

export interface MapFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGuideId: string | null;
  guides: GuideSummary[];
  onSelectGuide: (guideId: string | null) => void;
  activeQuickFilter: MapQuickFilter;
  onSelectQuickFilter: (filter: MapQuickFilter) => void;
  totalVisibleCount: number;
}

interface FilterChipOption {
  key: MapQuickFilter;
  label: string;
  icon?: string;
}

const FILTER_CHIPS: FilterChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'open_now', label: 'Open Now 🟢' },
  { key: 'bookable', label: 'Bookable 🍷' },
  { key: 'unorganized', label: 'Unorganized ✨' },
  { key: 'visited', label: 'Visited ✓' },
];

export function MapFilterBar({
  searchQuery,
  onSearchChange,
  selectedGuideId,
  guides,
  onSelectGuide,
  activeQuickFilter,
  onSelectQuickFilter,
  totalVisibleCount,
}: MapFilterBarProps) {
  const { colors } = useTheme();
  const [isGuideModalVisible, setIsGuideModalVisible] = useState(false);

  const selectedGuide = guides.find((g) => g.id === selectedGuideId);

  const handleGuidePillPress = () => {
    haptics.tap();
    setIsGuideModalVisible(true);
  };

  const handleSelectGuideOption = (guideId: string | null) => {
    haptics.selection();
    onSelectGuide(guideId);
    setIsGuideModalVisible(false);
  };

  const handleChipPress = (filter: MapQuickFilter) => {
    haptics.tap();
    onSelectQuickFilter(filter);
  };

  return (
    <View style={styles.container}>
      {/* Search Input Row with Guide Selector */}
      <View style={styles.searchRow}>
        <SearchInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search cravings, dishes, vibes..."
          containerStyle={[
            styles.searchInputContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
              shadowColor: colors.shadow,
            },
          ]}
        />

        {/* Guide Dropdown Pill */}
        <TouchableOpacity
          style={[
            styles.guidePill,
            {
              backgroundColor: selectedGuideId
                ? colors.primary
                : colors.cardBackground,
              borderColor: selectedGuideId ? colors.primary : colors.cardBorder,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={handleGuidePillPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            selectedGuide
              ? `Guide filter: ${selectedGuide.name}`
              : 'Select guide filter'
          }
        >
          <Text
            style={[
              styles.guidePillText,
              {
                color: selectedGuideId ? colors.onPrimary : colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {selectedGuide
              ? `${selectedGuide.emojiIcon} ${selectedGuide.name}`
              : 'All Guides'}
          </Text>
          <CaretDownIcon
            size={12}
            color={selectedGuideId ? colors.onPrimary : colors.textSubtle}
            weight="bold"
          />
        </TouchableOpacity>
      </View>

      {/* Horizontal Filter Chips Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContainer}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeQuickFilter === chip.key;
          const label =
            chip.key === 'all' ? `All (${totalVisibleCount})` : chip.label;

          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.cardBackground,
                  borderColor: isActive ? colors.primary : colors.cardBorder,
                  shadowColor: colors.shadow,
                },
              ]}
              onPress={() => handleChipPress(chip.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isActive ? colors.onPrimary : colors.text,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Guide Selection Modal */}
      <Modal
        visible={isGuideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGuideModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsGuideModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: colors.text,
                    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                  },
                ]}
              >
                Filter by Guide
              </Text>
              <TouchableOpacity
                onPress={() => setIsGuideModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <XIcon size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[
                { id: null, name: 'All Guides', emojiIcon: '📑' },
                ...guides,
              ]}
              keyExtractor={(item) => item.id || 'all'}
              renderItem={({ item }) => {
                const isSelected = selectedGuideId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.guideOptionItem,
                      {
                        borderBottomColor: colors.cardBorder,
                        backgroundColor: isSelected
                          ? colors.inputBackground
                          : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectGuideOption(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.guideOptionEmoji}>
                      {item.emojiIcon}
                    </Text>
                    <Text
                      style={[
                        styles.guideOptionName,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <CheckIcon
                        size={18}
                        color={colors.primary}
                        weight="bold"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.xs + 2,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs + 2,
  },
  searchInputContainer: {
    flex: 1,
    height: 42,
    borderRadius: Theme.radii.pill,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    maxWidth: 130,
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guidePillText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs + 2,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '60%',
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    padding: Theme.spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: Theme.spacing.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: 280,
  },
  guideOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm + 2,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  guideOptionEmoji: {
    fontSize: 16,
  },
  guideOptionName: {
    flex: 1,
    fontSize: 14,
  },
});
