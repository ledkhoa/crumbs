import { useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { CompactCrumbCard } from '@/components/crumbs/CompactCrumbCard';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface MapCrumbCarouselProps {
  carouselRef: React.RefObject<FlatList<EnrichedUserCrumb> | null>;
  crumbs: EnrichedUserCrumb[];
  selectedCrumbId: string | null;
  onSelectCrumb: (crumb: EnrichedUserCrumb) => void;
  onCrumbCardPress: (crumb: EnrichedUserCrumb) => void;
  onAddToGuidePress: (crumb: EnrichedUserCrumb) => void;
  onBookOrMapPress: (crumb: EnrichedUserCrumb) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const MAP_CARD_WIDTH = SCREEN_WIDTH - 48;
export const MAP_CARD_GAP = 12;
export const MAP_SNAP_INTERVAL = MAP_CARD_WIDTH + MAP_CARD_GAP;
export const MAP_CAROUSEL_PADDING = 24;

export function MapCrumbCarousel({
  carouselRef,
  crumbs,
  selectedCrumbId,
  onSelectCrumb,
  onCrumbCardPress,
  onAddToGuidePress,
  onBookOrMapPress,
}: MapCrumbCarouselProps) {
  const isInternalScrollRef = useRef(false);

  // Auto-scroll when selectedCrumbId changes externally (e.g. pin tapped)
  useEffect(() => {
    if (!selectedCrumbId || crumbs.length === 0) return;
    const index = crumbs.findIndex((c) => c.id === selectedCrumbId);
    if (index >= 0 && carouselRef.current) {
      isInternalScrollRef.current = true;
      try {
        carouselRef.current.scrollToOffset({
          offset: index * MAP_SNAP_INTERVAL,
          animated: true,
        });
      } catch {
        // FlatList scroll race protection
      }
      const timer = setTimeout(() => {
        isInternalScrollRef.current = false;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedCrumbId, crumbs, carouselRef]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isInternalScrollRef.current) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / MAP_SNAP_INTERVAL);
      if (index >= 0 && index < crumbs.length) {
        const crumb = crumbs[index];
        if (crumb && crumb.id !== selectedCrumbId) {
          onSelectCrumb(crumb);
        }
      }
    },
    [crumbs, selectedCrumbId, onSelectCrumb],
  );

  const renderItem = useCallback(
    ({ item }: { item: EnrichedUserCrumb }) => {
      return (
        <View style={{ width: MAP_CARD_WIDTH }}>
          <CompactCrumbCard
            crumb={item}
            onPress={onCrumbCardPress}
            onAddToGuide={onAddToGuidePress}
            onBookOrMapPress={onBookOrMapPress}
          />
        </View>
      );
    },
    [onCrumbCardPress, onAddToGuidePress, onBookOrMapPress],
  );

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={carouselRef}
        data={crumbs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={MAP_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.contentContainer}
        onMomentumScrollEnd={handleScrollEnd}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: MAP_SNAP_INTERVAL,
          offset: index * MAP_SNAP_INTERVAL,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 4,
  },
  contentContainer: {
    paddingHorizontal: MAP_CAROUSEL_PADDING,
    gap: MAP_CARD_GAP,
  },
});
