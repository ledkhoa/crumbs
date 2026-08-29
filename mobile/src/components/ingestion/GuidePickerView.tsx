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
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useGuidesQuery } from '@/hooks/useGuides';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FolderSimpleIcon,
} from 'phosphor-react-native';

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
  const { colors } = useTheme();
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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <CaretLeftIcon size={22} color={colors.text} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Add to Guide</Text>
        <Text
          style={[styles.subtitle, { color: colors.textMuted }]}
          numberOfLines={1}
        >
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
        style={[
          styles.createGuideRow,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
        ]}
        onPress={() => {
          haptics.primary();
          onOpenCreateGuide();
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Create New Guide"
      >
        <View
          style={[
            styles.createIconContainer,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <PlusIcon size={18} color={colors.primary} weight="bold" />
        </View>
        <View style={styles.guideInfo}>
          <Text style={[styles.createGuideTitle, { color: colors.primary }]}>
            Create New Guide
          </Text>
          <Text
            style={[styles.createGuideSubtitle, { color: colors.textMuted }]}
          >
            Start a new craving itinerary or list
          </Text>
        </View>
        <CaretRightIcon size={16} color={colors.textSubtle} weight="bold" />
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

      {/* Guides List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your guides...
          </Text>
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
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                  isSelecting && {
                    borderColor: colors.primary,
                    backgroundColor: colors.inputBackground,
                  },
                ]}
                onPress={() => handleSelectGuide(guide.id)}
                disabled={submittingGuideId !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${guide.name}, ${guide.crumbCount} ${guide.crumbCount === 1 ? 'crumb' : 'crumbs'}`}
              >
                <View
                  style={[
                    styles.emojiContainer,
                    { backgroundColor: colors.inputBackground },
                  ]}
                >
                  <Text style={styles.emojiText}>
                    {guide.emojiIcon || '🗺️'}
                  </Text>
                </View>
                <View style={styles.guideInfo}>
                  <Text
                    style={[styles.guideName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {guide.name}
                  </Text>
                  <Text
                    style={[styles.guideMeta, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {guide.crumbCount}{' '}
                    {guide.crumbCount === 1 ? 'crumb' : 'crumbs'}
                    {guide.description ? ` · ${guide.description}` : ''}
                  </Text>
                </View>
                {isSelecting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <CaretRightIcon
                    size={16}
                    color={colors.textSubtle}
                    weight="bold"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : searchQuery.trim().length > 0 ? (
        <EmptyState
          icon={
            <MagnifyingGlassIcon
              size={36}
              color={colors.textSubtle}
              weight="bold"
            />
          }
          title="No Matching Guides"
          description={`No guides found matching “${searchQuery}”. Tap Create New Guide above to make one!`}
        />
      ) : (
        <EmptyState
          icon={
            <FolderSimpleIcon
              size={36}
              color={colors.textSubtle}
              weight="bold"
            />
          }
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
  header: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  searchBarContainer: {
    marginBottom: Theme.spacing.md,
  },
  createGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Theme.radii.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  createIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  createGuideTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  createGuideSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: Theme.spacing.md,
  },
  listContainer: {
    gap: Theme.spacing.sm,
    paddingBottom: Theme.spacing.lg,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Theme.radii.lg,
    padding: Theme.spacing.md,
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: Theme.radii.md,
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
  },
  guideMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: Theme.spacing.xxl,
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  loadingText: {
    fontSize: 13,
  },
});
