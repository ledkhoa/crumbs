import { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useGuidesQuery } from '@/hooks/useGuides';
import { GuideCard, type GuideSummary } from '@/components/guides/GuideCard';
import { GuidesSkeletonList } from '@/components/guides/GuidesSkeletonList';
import { CreateGuideModal } from '@/components/guides/CreateGuideModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heading, MutedText } from '@/components/ui/Typography';
import {
  PlusIcon,
  WarningCircleIcon,
  FolderSimpleIcon,
} from 'phosphor-react-native';

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const {
    data: guides,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useGuidesQuery();

  // Position exactly 8px above the top edge of the native bottom tab bar
  const tabHeight = Platform.OS === 'ios' ? 49 : 56;
  const fabBottom = insets.bottom + tabHeight / 2;

  const handleOpenCreateModal = () => {
    haptics.primary();
    setModalVisible(true);
  };

  const handleSelectGuide = (_guide: GuideSummary) => {
    // Navigating to guide detail will be linked here
  };

  const handleRefresh = () => {
    haptics.tap();
    refetch();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Heading style={styles.screenTitle}>My Guides</Heading>
          <MutedText style={styles.screenSubtitle}>
            Curated food crawls, tasting menus & trips
          </MutedText>
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading && !isRefetching ? (
        <GuidesSkeletonList count={3} />
      ) : isError ? (
        <EmptyState
          icon={
            <WarningCircleIcon
              size={36}
              color={Theme.colors.error}
              weight="fill"
            />
          }
          title="Couldn't load guides"
          description={
            error instanceof Error ? error.message : 'Please try again later'
          }
          action={
            <Button variant="secondary" size="md" onPress={() => refetch()}>
              Try Again
            </Button>
          }
          style={styles.centerContainer}
        />
      ) : !guides || guides.length === 0 ? (
        <EmptyState
          icon={
            <FolderSimpleIcon
              size={36}
              color={Theme.colors.textSubtle}
              weight="bold"
            />
          }
          title="No guides created yet"
          description='Group your favorite crumbs into themed itineraries like "Soho Date Nights" or "Tokyo Ramen Crawl".'
          action={
            <Button variant="primary" size="lg" onPress={handleOpenCreateModal}>
              Create your first guide
            </Button>
          }
          style={styles.emptyContainer}
        />
      ) : (
        <FlatList
          data={guides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GuideCard guide={item} onPress={handleSelectGuide} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: fabBottom + 64 },
          ]}
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
      )}

      {/* Thumb-Reachable Floating Action Button */}
      <TouchableOpacity
        style={[styles.fabButton, { bottom: fabBottom }]}
        onPress={handleOpenCreateModal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new guide"
      >
        <PlusIcon size={24} color={Theme.colors.onPrimary} weight="bold" />
      </TouchableOpacity>

      {/* Create Guide Modal */}
      <CreateGuideModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
  screenTitle: {
    fontSize: 28,
  },
  screenSubtitle: {
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
  },
  centerContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
});
