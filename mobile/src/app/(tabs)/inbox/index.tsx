import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import {
  useCrumbsQuery,
  useCrumbsCountsQuery,
  useDeleteCrumbMutation,
} from '@/hooks/useCrumbs';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { useInboxStore } from '@/store/inbox';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompactCrumbCard } from '@/components/crumbs/CompactCrumbCard';
import {
  InboxFilterBar,
  type InboxFilterSegment,
} from '@/components/inbox/InboxFilterBar';
import { InboxSkeletonList } from '@/components/inbox/InboxSkeletonList';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export default function InboxScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] =
    useState<InboxFilterSegment>('uncategorized');

  const [guideModalTarget, setGuideModalTarget] =
    useState<EnrichedUserCrumb | null>(null);

  const addCrumbMutation = useAddCrumbToGuideMutation();
  const deleteCrumbMutation = useDeleteCrumbMutation();

  // Reset tab unread badge on screen focus
  useFocusEffect(
    useCallback(() => {
      useInboxStore.getState().markInboxAsViewed();
    }, []),
  );

  // Dedicated lightweight query for Inbox filter badges & counts
  const { data: countsData, refetch: refetchCounts } = useCrumbsCountsQuery();

  // TanStack Query for full crumbs data with distinct cache key per segment
  const { data, isLoading, isRefetching, refetch } = useCrumbsQuery({
    search: searchQuery ? searchQuery.trim() : undefined,
    unorganized: activeSegment === 'uncategorized' ? true : undefined,
  });

  const crumbs = useMemo(() => {
    // SAFETY: apiClient.crumbs.$get returns EnrichedUserCrumb array in crumbs field
    return (data?.crumbs || []) as EnrichedUserCrumb[];
  }, [data?.crumbs]);

  const counts = useMemo(
    () => ({
      all: countsData?.counts.all ?? 0,
      uncategorized: countsData?.counts.uncategorized ?? 0,
    }),
    [countsData],
  );

  const handleRefresh = async () => {
    haptics.tap();
    await Promise.all([refetch(), refetchCounts()]);
    haptics.tap();
  };

  const handleCardPress = (crumb: EnrichedUserCrumb) => {
    if (crumb.restaurant.mapsUrl) {
      Linking.openURL(crumb.restaurant.mapsUrl).catch(() => {});
    }
  };

  const handleAddToGuide = (crumb: EnrichedUserCrumb) => {
    setGuideModalTarget(crumb);
  };

  const handleGuideSelected = async (guideId: string) => {
    if (guideModalTarget) {
      try {
        await addCrumbMutation.mutateAsync({
          guideId,
          crumbIds: [guideModalTarget.id],
        });
      } catch (err) {
        console.warn('[InboxScreen] Failed to add crumb to guide:', err);
      }
    }
    setGuideModalTarget(null);
  };

  const handleBookOrMapPress = (crumb: EnrichedUserCrumb) => {
    const bookingUrl = crumb.restaurant.reservationUrl;
    if (bookingUrl) {
      Linking.openURL(bookingUrl).catch(() => {});
      return;
    }

    const mapsUrl =
      crumb.restaurant.mapsUrl ||
      `https://maps.apple.com/?q=${encodeURIComponent(
        `${crumb.restaurant.name} ${crumb.restaurant.formattedAddress || ''}`,
      )}`;
    Linking.openURL(mapsUrl).catch(() => {});
  };

  const handleDeleteCrumb = async (crumb: EnrichedUserCrumb) => {
    try {
      await deleteCrumbMutation.mutateAsync(crumb.id);
    } catch (err) {
      console.warn('[InboxScreen] Delete crumb error:', err);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title & Subtitle */}
      <View style={styles.titleRow}>
        <View style={styles.titleTextContainer}>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            Newly ingested crumbs from social reels awaiting organization.
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search crumbs, dishes, vibes, or @creators..."
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Filter Chips */}
      <InboxFilterBar
        activeSegment={activeSegment}
        onSelectSegment={setActiveSegment}
        counts={counts}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return <InboxSkeletonList count={4} />;
    }

    if (searchQuery) {
      return (
        <EmptyState
          emoji="🔍"
          title="No Matching Crumbs"
          description={`No crumbs found matching "${searchQuery}". Try a different keyword or filter.`}
          action={
            <Button
              variant="secondary"
              size="md"
              onPress={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          }
          style={styles.emptyState}
        />
      );
    }

    return (
      <EmptyState
        emoji="🍞"
        title="Inbox Zero! 🌿"
        description="All your captured crumbs are organized into guides! Share food reels from Instagram or TikTok directly to Crumbs to capture new crumbs."
        action={
          <View style={styles.emptyActions}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.push('/(tabs)/(home)')}
              leftIcon={<Text>🗺️ </Text>}
              style={styles.exploreMapButton}
            >
              Explore City Map
            </Button>
          </View>
        }
        style={styles.emptyState}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={crumbs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <CompactCrumbCard
              crumb={item}
              onPress={handleCardPress}
              onAddToGuide={handleAddToGuide}
              onBookOrMapPress={handleBookOrMapPress}
              onDelete={handleDeleteCrumb}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
      />

      {/* Guide Picker Modal */}
      {guideModalTarget && (
        <QuickAddToGuideModal
          visible={Boolean(guideModalTarget)}
          restaurantName={guideModalTarget.restaurant.name}
          crumbId={guideModalTarget.id}
          onClose={() => setGuideModalTarget(null)}
          onGuideSelected={handleGuideSelected}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  listContent: {
    paddingBottom: Theme.spacing.xxl + 40,
  },
  headerContainer: {
    paddingBottom: Theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 18,
  },
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  cardWrapper: {
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyState: {
    marginTop: Theme.spacing.xl,
  },
  emptyActions: {
    width: '100%',
    marginTop: Theme.spacing.sm,
  },
  exploreMapButton: {
    width: '100%',
  },
});
