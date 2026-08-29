import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import {
  useGuideDetailQuery,
  useDeleteGuideMutation,
  useRemoveCrumbFromGuideMutation,
} from '@/hooks/useGuides';
import { GuideCrumbCard } from '@/components/guides/GuideCrumbCard';
import { EditGuideModal } from '@/components/guides/EditGuideModal';
import { AddCrumbsToGuideModal } from '@/components/guides/AddCrumbsToGuideModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CaretLeftIcon,
  ShareNetworkIcon,
  DotsThreeVerticalIcon,
  MapPinIcon,
  PlusIcon,
  FolderSimpleIcon,
  WarningCircleIcon,
  SparkleIcon,
} from 'phosphor-react-native';

function getCourseOrder(category?: string | null): number {
  switch (category) {
    case 'aperitif':
      return 1;
    case 'cafe_bakery':
      return 2;
    case 'main':
      return 3;
    case 'digestif_dessert':
      return 4;
    default:
      return 99;
  }
}

export default function GuideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const guideId = Array.isArray(id) ? id[0] : id;

  const {
    data: guide,
    isLoading,
    isError,
    refetch,
  } = useGuideDetailQuery(guideId || '');
  const deleteMutation = useDeleteGuideMutation();
  const removeCrumbMutation = useRemoveCrumbFromGuideMutation();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddCrumbsModalVisible, setIsAddCrumbsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'crawl'>('all');

  const existingCrumbIds = useMemo(
    () => guide?.crumbs?.map((c) => c.crumbId) || [],
    [guide?.crumbs],
  );

  // Sort crumbs based on active mode (Standard sequence vs Food Crawl timeline)
  const displayCrumbs = useMemo(() => {
    if (!guide?.crumbs) return [];
    if (activeTab === 'all') return guide.crumbs;

    // In 'crawl' mode, sort by dining course timeline
    return [...guide.crumbs].sort((a, b) => {
      const orderA = getCourseOrder(a.attribution?.courseCategory);
      const orderB = getCourseOrder(b.attribution?.courseCategory);
      return orderA - orderB;
    });
  }, [guide?.crumbs, activeTab]);

  const handleShare = async () => {
    if (!guide) return;
    haptics.selection();
    try {
      await Share.share({
        title: guide.name,
        message: `Check out "${guide.name}" on Crumbs — ${guide.description || 'A curated food itinerary'}!`,
        url: `https://crumbs.app/guides/${guide.id}`,
      });
    } catch (err) {
      console.warn('[GuideDetail] Share failed:', err);
    }
  };

  const handleOpenMenu = () => {
    haptics.tap();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Guide', 'Share Guide', 'Delete Guide'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setIsEditModalVisible(true);
          } else if (buttonIndex === 2) {
            handleShare();
          } else if (buttonIndex === 3) {
            handleConfirmDelete();
          }
        },
      );
    } else {
      Alert.alert(guide?.name || 'Guide Options', undefined, [
        { text: 'Edit Guide', onPress: () => setIsEditModalVisible(true) },
        { text: 'Share Guide', onPress: handleShare },
        {
          text: 'Delete Guide',
          style: 'destructive',
          onPress: handleConfirmDelete,
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleConfirmDelete = () => {
    if (!guide) return;
    haptics.warning();
    Alert.alert(
      'Delete Guide',
      `Are you sure you want to delete "${guide.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(guide.id, {
              onSuccess: () => {
                router.back();
              },
            });
          },
        },
      ],
    );
  };

  const handleRemoveCrumb = (crumbId: string) => {
    if (!guide) return;
    removeCrumbMutation.mutate({
      guideId: guide.id,
      crumbId,
    });
  };

  const handleNavigateToCrumb = (crumbId: string) => {
    router.push({
      pathname: '/crumbs/[id]',
      params: { id: crumbId },
    });
  };

  const handleViewOnMap = () => {
    haptics.primary();
    router.push('/(tabs)/(home)');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingHeader}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={80} height={36} borderRadius={18} />
        </View>
        <View style={styles.loadingBody}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <View style={{ height: 16 }} />
          <Skeleton width="80%" height={32} borderRadius={8} />
          <View style={{ height: 8 }} />
          <Skeleton width="50%" height={20} borderRadius={6} />
          <View style={{ height: 24 }} />
          <Skeleton width="100%" height={80} borderRadius={Theme.radii.lg} />
          <View style={{ height: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={Theme.radii.lg} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !guide) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.floatingNavButton}
            onPress={() => router.back()}
          >
            <CaretLeftIcon size={20} color={Theme.colors.text} weight="bold" />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon={
            <WarningCircleIcon
              size={36}
              color={Theme.colors.error}
              weight="bold"
            />
          }
          title="Guide Not Found"
          description="We couldn't load this guide. It may have been deleted or is private."
          action={
            <Button variant="primary" size="md" onPress={() => router.back()}>
              Back to Guides
            </Button>
          }
          style={styles.centerContainer}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Floating Glass Navigation Bar */}
      <SafeAreaView edges={['top']} style={styles.navBarWrapper}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.floatingNavButton}
            onPress={() => {
              haptics.tap();
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <CaretLeftIcon size={20} color={Theme.colors.text} weight="bold" />
          </TouchableOpacity>

          <View style={styles.navBarRight}>
            <TouchableOpacity
              style={styles.floatingNavButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share guide"
            >
              <ShareNetworkIcon
                size={18}
                color={Theme.colors.text}
                weight="bold"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingNavButton}
              onPress={handleOpenMenu}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <DotsThreeVerticalIcon
                size={18}
                color={Theme.colors.text}
                weight="bold"
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Scroll Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header Section */}
        <View style={styles.heroHeader}>
          <View style={styles.emojiAvatar}>
            <Text style={styles.emojiText}>{guide.emojiIcon || '🗺️'}</Text>
          </View>

          <Text style={styles.guideTitle}>{guide.name}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaBadge}>
              {guide.crumbCount} {guide.crumbCount === 1 ? 'crumb' : 'crumbs'}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaBadge}>
              {guide.isPublic ? 'Public Guide' : 'Private'}
            </Text>
          </View>

          {guide.description ? (
            <Text style={styles.descriptionText}>{guide.description}</Text>
          ) : null}

          {/* Action Capsules */}
          <View style={styles.actionCapsuleRow}>
            <TouchableOpacity
              style={[styles.actionCapsule, styles.primaryCapsule]}
              onPress={handleViewOnMap}
              activeOpacity={0.8}
            >
              <MapPinIcon size={16} color="#FFFFFF" weight="fill" />
              <Text style={styles.primaryCapsuleText}>View on Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCapsule, styles.secondaryCapsule]}
              onPress={() => {
                haptics.tap();
                setIsAddCrumbsModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <PlusIcon size={16} color={Theme.colors.primary} weight="bold" />
              <Text style={styles.secondaryCapsuleText}>Add Crumbs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Selector Segmented Control */}
        {guide.crumbCount > 0 && (
          <View style={styles.modeSegmentContainer}>
            <TouchableOpacity
              style={[
                styles.modeSegmentTab,
                activeTab === 'all' && styles.modeSegmentTabActive,
              ]}
              onPress={() => {
                haptics.selection();
                setActiveTab('all');
              }}
            >
              <Text
                style={[
                  styles.modeSegmentText,
                  activeTab === 'all' && styles.modeSegmentTextActive,
                ]}
              >
                All Stops ({guide.crumbCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSegmentTab,
                activeTab === 'crawl' && styles.modeSegmentTabActive,
              ]}
              onPress={() => {
                haptics.selection();
                setActiveTab('crawl');
              }}
            >
              <SparkleIcon
                size={14}
                color={
                  activeTab === 'crawl'
                    ? Theme.colors.primary
                    : Theme.colors.textMuted
                }
                weight="fill"
              />
              <Text
                style={[
                  styles.modeSegmentText,
                  activeTab === 'crawl' && styles.modeSegmentTextActive,
                ]}
              >
                Food Crawl
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline Itinerary Stops */}
        {displayCrumbs.length === 0 ? (
          <EmptyState
            icon={
              <FolderSimpleIcon
                size={36}
                color={Theme.colors.textSubtle}
                weight="bold"
              />
            }
            title="No crumbs in this guide yet"
            description="Add your favorite dining spots to build a curated itinerary or tasting crawl."
            action={
              <Button
                variant="primary"
                size="md"
                onPress={() => setIsAddCrumbsModalVisible(true)}
              >
                + Add your first crumb
              </Button>
            }
            style={styles.emptyGuideState}
          />
        ) : (
          <View style={styles.timelineSection}>
            {displayCrumbs.map((item, idx) => (
              <GuideCrumbCard
                key={item.crumbId}
                item={item}
                index={idx}
                isLast={idx === displayCrumbs.length - 1}
                onPress={handleNavigateToCrumb}
                onRemove={handleRemoveCrumb}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Guide Modal */}
      <EditGuideModal
        visible={isEditModalVisible}
        guide={guide}
        onClose={() => setIsEditModalVisible(false)}
        onDeleted={() => router.back()}
      />

      {/* Add Crumbs to Guide Modal */}
      <AddCrumbsToGuideModal
        visible={isAddCrumbsModalVisible}
        guideId={guide.id}
        existingCrumbIds={existingCrumbIds}
        onClose={() => {
          setIsAddCrumbsModalVisible(false);
          refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 12,
  },
  loadingBody: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  navBarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 8,
  },
  navBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingNavButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: 48,
  },
  heroHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.inputBorder,
  },
  emojiAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emojiText: {
    fontSize: 34,
  },
  guideTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metaDot: {
    fontSize: 13,
    color: Theme.colors.textSubtle,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.radii.pill,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  primaryCapsule: {
    backgroundColor: Theme.colors.primary,
  },
  primaryCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryCapsule: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  secondaryCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.radii.pill,
    padding: 3,
    marginVertical: 16,
  },
  modeSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Theme.radii.pill,
  },
  modeSegmentTabActive: {
    backgroundColor: Theme.colors.cardBackground,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  modeSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  modeSegmentTextActive: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  timelineSection: {
    paddingTop: 8,
  },
  emptyGuideState: {
    marginTop: 32,
  },
});
