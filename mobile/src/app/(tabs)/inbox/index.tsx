import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import {
  useCrumbsQuery,
  useCrumbsCountsQuery,
  useDeleteCrumbMutation,
} from '@/hooks/useCrumbs';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { useInboxStore } from '@/store/inbox';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CompactCrumbCard } from '@/components/crumbs/CompactCrumbCard';
import {
  InboxFilterBar,
  type InboxFilterSegment,
} from '@/components/inbox/InboxFilterBar';
import { InboxSkeletonList } from '@/components/inbox/InboxSkeletonList';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import { SparkleIcon, MapTrifoldIcon } from 'phosphor-react-native';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export default function InboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeSegment, setActiveSegment] =
    useState<InboxFilterSegment>('uncategorized');

  const [guideModalTarget, setGuideModalTarget] =
    useState<EnrichedUserCrumb | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const { data, isLoading, refetch } = useCrumbsQuery({
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
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchCounts()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCardPress = (crumb: EnrichedUserCrumb) => {
    haptics.tap();
    router.push({
      pathname: '/crumbs/[id]',
      params: { id: crumb.id },
    });
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
        console.error('[Inbox] Failed to add crumb to guide:', err);
      } finally {
        setGuideModalTarget(null);
      }
    }
  };

  const handleBookOrMapPress = (crumb: EnrichedUserCrumb) => {
    const { restaurant } = crumb;
    if (restaurant.reservationUrl) {
      haptics.tap();
      Linking.openURL(restaurant.reservationUrl).catch((err) =>
        console.warn('[Inbox] Could not open reservation link:', err),
      );
    } else {
      haptics.primary();
      router.push({
        pathname: '/(tabs)/(home)',
        params: { crumbId: crumb.id, t: String(Date.now()) },
      });
    }
  };

  const handleDeleteCrumb = (crumb: EnrichedUserCrumb) => {
    deleteCrumbMutation.mutate(crumb.id);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Screen Title & Subtitle */}
      <View style={styles.titleRow}>
        <View style={styles.titleTextContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Captured dining crumbs waiting to be organized
          </Text>
        </View>
      </View>

      {/* AI-Powered Search Trigger */}
      <View style={styles.aiSearchContainer}>
        <TouchableOpacity
          style={[
            styles.aiSearchBar,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
          activeOpacity={0.75}
          onPress={() => {
            haptics.tap();
          }}
          accessibilityRole="button"
          accessibilityLabel="AI Search coming soon"
        >
          <View style={styles.aiSearchLeft}>
            <SparkleIcon size={16} color={colors.primary} weight="fill" />
            <Text
              style={[styles.aiSearchPlaceholder, { color: colors.textSubtle }]}
            >
              Ask AI or search your cravings...
            </Text>
          </View>
          <View style={styles.aiSearchBadge}>
            <Text style={[styles.aiSearchBadgeText, { color: colors.primary }]}>
              AI · Soon
            </Text>
          </View>
        </TouchableOpacity>
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
    if (isLoading && !data) {
      return <InboxSkeletonList count={4} />;
    }

    return (
      <EmptyState
        icon={<SparkleIcon size={36} color={colors.primary} weight="fill" />}
        title="Inbox Zero!"
        description="All your captured crumbs are organized into guides! Share food reels from Instagram or TikTok directly to Crumbs to capture new crumbs."
        action={
          <View style={styles.emptyActions}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.push('/(tabs)/(home)')}
              leftIcon={
                <MapTrifoldIcon
                  size={18}
                  color={colors.onPrimary}
                  weight="bold"
                />
              }
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  aiSearchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  aiSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
  },
  aiSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  aiSearchPlaceholder: {
    fontSize: 13,
    fontWeight: '500',
  },
  aiSearchBadge: {
    backgroundColor: 'rgba(196, 91, 62, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radii.pill,
  },
  aiSearchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardWrapper: {
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyState: {
    marginTop: Theme.spacing.xl,
  },
  emptyActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  exploreMapButton: {
    minWidth: 200,
    alignSelf: 'center',
  },
});
