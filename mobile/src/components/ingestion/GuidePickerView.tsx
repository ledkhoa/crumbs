import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useGuidesQuery } from '@/hooks/useGuides';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';

export interface GuidePickerViewProps {
  restaurantName?: string;
  crumbIds?: string[];
  onBack: () => void;
  onSelectGuide: (guideId: string) => Promise<void> | void;
  onOpenCreateGuide: () => void;
}

export function GuidePickerView({
  restaurantName,
  crumbIds,
  onBack,
  onSelectGuide,
  onOpenCreateGuide,
}: GuidePickerViewProps) {
  const { data: guides, isLoading } = useGuidesQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingGuideId, setSubmittingGuideId] = useState<string | null>(
    null,
  );

  const totalCount = crumbIds && crumbIds.length > 0 ? crumbIds.length : 1;
  const isMulti = totalCount > 1;

  // Filter guides in real-time by search query
  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    if (!searchQuery.trim()) return guides;
    const query = searchQuery.toLowerCase().trim();
    return guides.filter(
      (guide) =>
        guide.name.toLowerCase().includes(query) ||
        (guide.description && guide.description.toLowerCase().includes(query)),
    );
  }, [guides, searchQuery]);

  const handleSelectGuide = async (guideId: string) => {
    haptics.selection();
    setSubmittingGuideId(guideId);
    try {
      await onSelectGuide(guideId);
      haptics.success();
    } catch (err) {
      haptics.error();
      console.error('Failed to add to guide:', err);
    } finally {
      setSubmittingGuideId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Row */}
      <View style={styles.topNavRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            haptics.tap();
            onBack();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to crumb preview"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add to Guide</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {isMulti
            ? `Save ${totalCount} crumbs to your curated guides`
            : restaurantName
              ? `Save “${restaurantName}” to your curated guides`
              : 'Save to your curated guides'}
        </Text>
      </View>

      {/* Search Input Bar */}
      <SearchInput
        placeholder="Search your guides..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={styles.searchBarContainer}
      />

      {/* Create New Guide Action Row */}
      <TouchableOpacity
        style={styles.createGuideRow}
        onPress={() => {
          haptics.tap();
          onOpenCreateGuide();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Create New Guide"
      >
        <View style={styles.createIconContainer}>
          <Text style={styles.createIcon}>＋</Text>
        </View>
        <View style={styles.guideInfo}>
          <Text style={styles.createGuideTitle}>Create New Guide</Text>
          <Text style={styles.createGuideSubtitle}>
            Start a new craving itinerary or list
          </Text>
        </View>
        <Text style={styles.selectArrow}>→</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Guides List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your guides...</Text>
        </View>
      ) : filteredGuides.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
        >
          {filteredGuides.map((guide) => {
            const isSelecting = submittingGuideId === guide.id;
            return (
              <TouchableOpacity
                key={guide.id}
                style={[
                  styles.guideRow,
                  isSelecting && styles.guideRowSelecting,
                ]}
                onPress={() => handleSelectGuide(guide.id)}
                disabled={submittingGuideId !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${guide.name}, ${guide.crumbCount} ${guide.crumbCount === 1 ? 'crumb' : 'crumbs'}`}
              >
                <View style={styles.emojiContainer}>
                  <Text style={styles.emojiText}>
                    {guide.emojiIcon || '🗺️'}
                  </Text>
                </View>
                <View style={styles.guideInfo}>
                  <Text style={styles.guideName} numberOfLines={1}>
                    {guide.name}
                  </Text>
                  <Text style={styles.guideMeta} numberOfLines={1}>
                    {guide.crumbCount}{' '}
                    {guide.crumbCount === 1 ? 'crumb' : 'crumbs'}
                    {guide.description ? ` · ${guide.description}` : ''}
                  </Text>
                </View>
                {isSelecting ? (
                  <ActivityIndicator
                    size="small"
                    color={Theme.colors.primary}
                  />
                ) : (
                  <Text style={styles.selectArrow}>→</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : searchQuery.trim().length > 0 ? (
        <EmptyState
          emoji="🔍"
          title="No Matching Guides"
          description={`No guides found matching “${searchQuery}”. Tap Create New Guide above to make one!`}
        />
      ) : (
        <EmptyState
          emoji="🗺️"
          title="No Guides Yet"
          description="Create your first guide to organize your favorite crumbs!"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  backButton: {
    paddingVertical: Theme.spacing.xs,
    paddingRight: Theme.spacing.md,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  header: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  searchBarContainer: {
    marginBottom: Theme.spacing.md,
  },
  createGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.primaryLight,
    borderRadius: Theme.radii.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  createIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Theme.radii.md,
    backgroundColor: Theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  createIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  createGuideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  createGuideSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.inputBorder,
    marginBottom: Theme.spacing.md,
  },
  listContainer: {
    gap: Theme.spacing.sm,
    paddingBottom: Theme.spacing.lg,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    borderRadius: Theme.radii.lg,
    padding: Theme.spacing.md,
  },
  guideRowSelecting: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.inputBackground,
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: Theme.radii.md,
    backgroundColor: Theme.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  emojiText: {
    fontSize: 22,
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  guideMeta: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  selectArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textSubtle,
    marginLeft: Theme.spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Theme.spacing.xxl,
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
});
