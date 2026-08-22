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
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { Button } from '@/components/ui/Button';
import { IngestionCrumbCard } from './IngestionCrumbCard';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Theme.spacing.lg * 2;
const CARD_SPACING = Theme.spacing.md;

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
  const [activeIndex, setActiveIndex] = useState(0);
  const lastReportedIndex = useRef(0);

  const selectedCrumbs = crumbs.filter((c) =>
    selectedCrumbIds.has(c.crumbId || c.id || c.name),
  );
  const selectedCount = selectedCrumbs.length;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    if (
      newIndex >= 0 &&
      newIndex < crumbs.length &&
      newIndex !== lastReportedIndex.current
    ) {
      lastReportedIndex.current = newIndex;
      setActiveIndex(newIndex);
      haptics.selection();
    }
  };

  const handleAddSelected = () => {
    if (selectedCount === 0) return;
    onAddSelectedToGuide(selectedCrumbs);
  };

  const handleViewAll = () => {
    onViewInInbox();
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Carousel */}
      <ScrollView
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
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.paginationText}>
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
          leftIcon={selectedCount > 0 ? <Text>🗺️ </Text> : undefined}
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
          leftIcon={<Text>📥 </Text>}
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
    backgroundColor: Theme.colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Theme.colors.inputBorder,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  bulkActions: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  primaryBulkButton: {
    height: 52,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.45,
    backgroundColor: Theme.colors.textMuted,
  },
  primaryBulkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  secondaryBulkButton: {
    height: 48,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBulkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
  },
});
