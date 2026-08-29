import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { Button } from '@/components/ui/Button';
import { IngestionCrumbCard } from './IngestionCrumbCard';
import { PlusIcon, TrayIcon } from 'phosphor-react-native';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 64, 340);
const CARD_SPACING = 12;

export interface CrumbsPickerCarouselProps {
  crumbs: UnifiedRestaurantSpot[];
  selectedCrumbIds: Set<string>;
  onToggleSelect: (crumb: UnifiedRestaurantSpot) => void;
  onAddSelectedToGuide: (selectedCrumbs: UnifiedRestaurantSpot[]) => void;
  onViewInInbox: () => void;
}

export function CrumbsPickerCarousel({
  crumbs,
  selectedCrumbIds,
  onToggleSelect,
  onAddSelectedToGuide,
  onViewInInbox,
}: CrumbsPickerCarouselProps) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const selectedCount = selectedCrumbIds.size;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    if (
      nextIndex !== activeIndex &&
      nextIndex >= 0 &&
      nextIndex < crumbs.length
    ) {
      setActiveIndex(nextIndex);
    }
  };

  const handleAddSelected = () => {
    haptics.primary();
    const selectedCrumbs = crumbs.filter((c) =>
      selectedCrumbIds.has(c.crumbId || c.id || c.name),
    );
    onAddSelectedToGuide(selectedCrumbs);
  };

  const handleViewAll = () => {
    onViewInInbox();
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {crumbs.map((crumb, index) => {
          const crumbKey = crumb.crumbId || crumb.id || crumb.name + index;
          const isSelected = selectedCrumbIds.has(
            crumb.crumbId || crumb.id || crumb.name,
          );

          return (
            <View key={crumbKey} style={styles.slideWrapper}>
              <IngestionCrumbCard
                crumb={crumb}
                selectable={true}
                selected={isSelected}
                onToggleSelect={onToggleSelect}
                cardWidth={CARD_WIDTH}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination Indicator */}
      <View style={styles.paginationRow}>
        <View style={styles.dotsContainer}>
          {crumbs.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: colors.primary }]
                  : [
                      styles.dotInactive,
                      { backgroundColor: colors.inputBorder },
                    ],
              ]}
            />
          ))}
        </View>
        <Text style={[styles.paginationText, { color: colors.textMuted }]}>
          {activeIndex + 1} of {crumbs.length}
        </Text>
      </View>

      {/* Bulk Action Buttons with Live Selected Count */}
      <View style={styles.bulkActions}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleAddSelected}
          disabled={selectedCount === 0}
          leftIcon={
            selectedCount > 0 ? (
              <PlusIcon size={18} color={colors.onPrimary} weight="bold" />
            ) : undefined
          }
          accessibilityLabel={`Add ${selectedCount} ${selectedCount === 1 ? 'Crumb' : 'Crumbs'} to Guide`}
        >
          {selectedCount > 0
            ? `Add ${selectedCount} ${selectedCount === 1 ? 'Crumb' : 'Crumbs'} to Guide`
            : 'Select Crumbs to Add'}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onPress={handleViewAll}
          leftIcon={<TrayIcon size={18} color={colors.text} weight="bold" />}
          accessibilityLabel="View All in Inbox"
        >
          View All in Inbox
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: CARD_SPACING,
    paddingBottom: Theme.spacing.sm,
  },
  slideWrapper: {
    width: CARD_WIDTH,
  },
  paginationRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: Theme.radii.pill,
  },
  dotActive: {
    width: 18,
  },
  dotInactive: {
    width: 6,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bulkActions: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
});
