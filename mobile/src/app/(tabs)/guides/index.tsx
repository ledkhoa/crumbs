import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useGuidesQuery } from '@/hooks/useGuides';
import { GuideCard, type GuideSummary } from '@/components/guides/GuideCard';
import { CreateGuideModal } from '@/components/guides/CreateGuideModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heading, MutedText } from '@/components/ui/Typography';

export default function GuidesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const {
    data: guides,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useGuidesQuery();

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

        <Button
          variant="outline"
          size="sm"
          onPress={handleOpenCreateModal}
          leftIcon={<Text style={styles.createButtonIcon}>➕</Text>}
          style={styles.createButton}
          textStyle={styles.createButtonText}
        >
          New
        </Button>
      </View>

      {/* Main Content Area */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your guides...</Text>
        </View>
      ) : isError ? (
        <EmptyState
          emoji="⚠️"
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
          emoji="🗺️"
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
      )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    borderRadius: Theme.radii.pill,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    backgroundColor: Theme.colors.cardBackground,
    borderColor: Theme.colors.cardBorder,
  },
  createButtonIcon: {
    fontSize: 12,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
    paddingTop: Theme.spacing.xs,
  },
  centerContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
  },
});
