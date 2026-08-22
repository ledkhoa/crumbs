import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useGuidesQuery } from '@/hooks/useGuides';
import { GuideCard, type GuideSummary } from '@/components/guides/GuideCard';
import { CreateGuideModal } from '@/components/guides/CreateGuideModal';

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
          <Text style={styles.screenTitle}>My Guides</Text>
          <Text style={styles.screenSubtitle}>
            Curated food crawls, tasting menus & trips
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonIcon}>➕</Text>
          <Text style={styles.createButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {isLoading && !isRefetching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your guides...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load guides</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error ? error.message : 'Please try again later'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              haptics.tap();
              refetch();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !guides || guides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
          </View>
          <Text style={styles.emptyTitle}>No guides created yet</Text>
          <Text style={styles.emptySubtitle}>
            Group your favorite spots into themed itineraries like "Soho Date
            Nights" or "Tokyo Bakery Crawl".
          </Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyActionButtonText}>
              Create your first guide
            </Text>
          </TouchableOpacity>
        </View>
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
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    borderRadius: Theme.radii.pill,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  createButtonIcon: {
    fontSize: 12,
    marginRight: Theme.spacing.xs,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: Theme.spacing.sm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  emptyActionButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: 14,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyActionButtonText: {
    color: Theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
