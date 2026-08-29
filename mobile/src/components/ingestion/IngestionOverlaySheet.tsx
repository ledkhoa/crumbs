import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { parseSocialUrl } from '@/utils/social-url';
import { useIngestion } from '@/hooks/useIngestion';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { useInboxStore } from '@/store/inbox';
import { IngestionProgressSteps } from './IngestionProgressSteps';
import { IngestionCrumbCard } from './IngestionCrumbCard';
import { CrumbsPickerCarousel } from './CrumbsPickerCarousel';
import { GuidePickerView } from './GuidePickerView';
import { CreateGuideForm } from '@/components/guides/CreateGuideForm';
import { IngestionErrorState } from './IngestionErrorState';
import { GrabHandle } from '@/components/ui/GrabHandle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SocialPlatformIcon } from '@/components/ui/SocialPlatformIcon';
import { PlusIcon, TrayIcon } from 'phosphor-react-native';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

export interface IngestionOverlaySheetProps {
  /** The incoming URL shared from Instagram or TikTok */
  sourceUrl: string;
  /** Optional pre-filled caption passed by the OS share intent */
  initialCaption?: string;
  /** Controls modal visibility */
  visible: boolean;
  /** Callback to close the overlay */
  onClose: () => void;
  /** Callback when user navigates directly to Inbox screen */
  onNavigateToInbox: (crumbId?: string) => void;
  /** Callback when crumb is added to a specific guide */
  onAddedToGuide?: (guideId: string, crumbId: string) => void;
}

type SheetView = 'preview' | 'guide_picker' | 'create_guide';

export function IngestionOverlaySheet({
  sourceUrl,
  initialCaption,
  visible,
  onClose,
  onNavigateToInbox,
  onAddedToGuide,
}: IngestionOverlaySheetProps) {
  const router = useRouter();
  const addCrumbMutation = useAddCrumbToGuideMutation();

  const {
    phase,
    steps,
    activeStepIndex,
    result,
    error,
    workflowId,
    startIngestion,
    cancelIngestion,
    retry,
  } = useIngestion();

  const [sheetView, setSheetView] = useState<SheetView>('preview');
  const [selectedCrumbIds, setSelectedCrumbIds] = useState<Set<string>>(
    new Set(),
  );
  const [guideTarget, setGuideTarget] = useState<{
    restaurantName?: string;
    crumbIds?: string[];
  }>({});

  const parsedUrl = parseSocialUrl(sourceUrl);
  const hasStartedRef = useRef<string | null>(null);

  // Initialize selectedCrumbIds to all crumbs when result arrives
  useEffect(() => {
    if (result && result.spots.length > 0) {
      const allIds = new Set(
        result.spots.map((c) => c.crumbId || c.id || c.name),
      );
      setSelectedCrumbIds(allIds);
    }
  }, [result]);

  useEffect(() => {
    if (visible && sourceUrl && hasStartedRef.current !== sourceUrl) {
      hasStartedRef.current = sourceUrl;
      setSheetView('preview');
      startIngestion(sourceUrl);
    }
  }, [visible, sourceUrl, startIngestion]);

  const handleClose = () => {
    haptics.tap();
    hasStartedRef.current = null;
    setSheetView('preview');
    cancelIngestion();
    onClose();
  };

  const handleRunInBackground = () => {
    haptics.tap();
    if (workflowId && sourceUrl) {
      useInboxStore.getState().addBackgroundJob({ workflowId, sourceUrl });
    }
    onClose();
  };

  const handleToggleSelectCrumb = (crumb: UnifiedRestaurantSpot) => {
    const key = crumb.crumbId || crumb.id || crumb.name;
    setSelectedCrumbIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSingleAddToGuide = (crumb: UnifiedRestaurantSpot) => {
    haptics.primary();
    const cId = crumb.crumbId || crumb.id;
    setGuideTarget({
      restaurantName: crumb.name,
      crumbIds: cId ? [cId] : [],
    });
    setSheetView('guide_picker');
  };

  const handleAddSelectedToGuide = (
    selectedCrumbs: UnifiedRestaurantSpot[],
  ) => {
    if (selectedCrumbs.length === 0) return;
    if (selectedCrumbs.length === 1) {
      handleSingleAddToGuide(selectedCrumbs[0]);
    } else {
      const ids = selectedCrumbs
        .map((c) => c.crumbId || c.id)
        .filter((id): id is string => Boolean(id));
      setGuideTarget({
        crumbIds: ids,
      });
      setSheetView('guide_picker');
    }
  };

  const handleGuideSelected = async (guideId: string) => {
    const ids = guideTarget.crumbIds || [];
    if (ids.length > 0) {
      try {
        await addCrumbMutation.mutateAsync({ guideId, crumbIds: ids });
      } catch (e) {
        console.warn('[IngestionOverlaySheet] addCrumb error:', e);
      }
    }

    onAddedToGuide?.(guideId, ids[0] || '');
    setSheetView('preview');
    onClose();
  };

  const handleSearchManually = () => {
    haptics.tap();
    onClose();
    router.push('/(tabs)/(home)');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          Platform.OS !== 'ios' && styles.androidBackdrop,
        ]}
      >
        {Platform.OS !== 'ios' && (
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        )}

        <View style={styles.sheetContent}>
          {/* Grab Handle */}
          <GrabHandle />

          {/* VIEW 1: PREVIEW / PROGRESS / ERROR */}
          {sheetView === 'preview' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* STATE 1-3: LIVE INGESTION IN PROGRESS */}
              {(phase === 'starting' ||
                phase === 'in_progress' ||
                phase === 'fast_path_resolved') && (
                <View style={styles.progressSection}>
                  <IngestionProgressSteps
                    steps={steps}
                    activeStepIndex={activeStepIndex}
                  />

                  {/* Actions while processing */}
                  <View style={styles.progressActions}>
                    <Button
                      variant="secondary"
                      size="md"
                      onPress={handleRunInBackground}
                      style={styles.secondaryProgressButton}
                    >
                      Run in Background
                    </Button>

                    <Button
                      variant="outline"
                      size="md"
                      onPress={handleClose}
                      style={styles.cancelProgressButton}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              )}

              {/* STATE 4: COMPLETED CRUMB PREVIEW */}
              {phase === 'completed' &&
                result &&
                result.spots &&
                result.spots.length > 0 && (
                  <View style={styles.completedContent}>
                    {/* Unified Top Ingestion Header */}
                    <View style={styles.unifiedHeader}>
                      <View style={styles.headerTopRow}>
                        {/* Creator Attribution */}
                        {result.authorUsername ? (
                          <Badge
                            variant="default"
                            corner="pill"
                            icon={
                              <SocialPlatformIcon
                                platform={parsedUrl.platform}
                                size={12}
                                color={Theme.colors.text}
                              />
                            }
                            label={`@${result.authorUsername}`}
                            style={styles.authorBadge}
                            textStyle={styles.authorText}
                          />
                        ) : (
                          <Badge
                            variant="default"
                            corner="pill"
                            icon={
                              <SocialPlatformIcon
                                platform={parsedUrl.platform}
                                size={12}
                                color={Theme.colors.text}
                              />
                            }
                            label={
                              parsedUrl.platform === 'tiktok'
                                ? 'TikTok'
                                : 'Instagram'
                            }
                            style={styles.platformBadge}
                            textStyle={styles.platformBadgeText}
                          />
                        )}

                        {/* Crumb Counter Pill */}
                        <Badge
                          variant="secondary"
                          corner="pill"
                          label={`${result.spots.length} ${
                            result.spots.length === 1 ? 'Crumb' : 'Crumbs'
                          }`}
                          style={styles.crumbCountBadge}
                          textStyle={styles.crumbCountText}
                        />
                      </View>

                      {/* Short Post Summary */}
                      {(result.summary || result.caption) && (
                        <Text style={styles.postSummaryText} numberOfLines={5}>
                          {result.summary || result.caption}
                        </Text>
                      )}
                    </View>

                    {/* Crumb Presentation: Carousel for 2+ crumbs, Single Card for 1 crumb */}
                    {result.spots.length >= 2 ? (
                      <CrumbsPickerCarousel
                        crumbs={result.spots}
                        selectedCrumbIds={selectedCrumbIds}
                        onToggleSelect={handleToggleSelectCrumb}
                        onAddSelectedToGuide={handleAddSelectedToGuide}
                        onViewInInbox={() => onNavigateToInbox()}
                      />
                    ) : result.spots.length === 1 ? (
                      <View style={styles.singleCrumbContainer}>
                        <IngestionCrumbCard
                          crumb={result.spots[0]}
                          selectable={false}
                        />

                        {/* Single Crumb Action Buttons */}
                        <View style={styles.singleButtonGroup}>
                          <Button
                            variant="primary"
                            size="lg"
                            onPress={() =>
                              handleSingleAddToGuide(result.spots[0])
                            }
                            leftIcon={
                              <PlusIcon
                                size={18}
                                color={Theme.colors.onPrimary}
                                weight="bold"
                              />
                            }
                            style={styles.primaryButton}
                          >
                            Add Crumb to Guide
                          </Button>

                          <Button
                            variant="secondary"
                            size="lg"
                            onPress={() => {
                              onNavigateToInbox(
                                result.spots[0]?.crumbId || result.spots[0]?.id,
                              );
                            }}
                            leftIcon={
                              <TrayIcon
                                size={18}
                                color={Theme.colors.text}
                                weight="bold"
                              />
                            }
                            style={styles.secondaryButton}
                          >
                            View in Inbox
                          </Button>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

              {/* STATE 5A: UNRELATED NON-RESTAURANT POST */}
              {phase === 'unrelated' && (
                <IngestionErrorState
                  type="unrelated"
                  captionSnippet={result?.caption || initialCaption}
                  onSearchManually={handleSearchManually}
                  onDismiss={handleClose}
                />
              )}

              {/* STATE 5B: INGESTION ERROR */}
              {phase === 'error' && (
                <IngestionErrorState
                  type="error"
                  errorMessage={error?.message}
                  onRetry={retry}
                  onSearchManually={handleSearchManually}
                  onDismiss={handleClose}
                />
              )}
            </ScrollView>
          )}

          {/* VIEW 2: IN-SHEET GUIDE PICKER */}
          {sheetView === 'guide_picker' && (
            <GuidePickerView
              restaurantName={guideTarget.restaurantName}
              crumbIds={guideTarget.crumbIds}
              onBack={() => setSheetView('preview')}
              onSelectGuide={handleGuideSelected}
              onOpenCreateGuide={() => setSheetView('create_guide')}
            />
          )}

          {/* VIEW 3: IN-SHEET CREATE GUIDE FORM */}
          {sheetView === 'create_guide' && (
            <View style={styles.createGuideContainer}>
              <CreateGuideForm
                onCancel={() => setSheetView('guide_picker')}
                onSuccess={async (newGuide) => {
                  if (newGuide?.id) {
                    await handleGuideSelected(newGuide.id);
                  } else {
                    setSheetView('guide_picker');
                  }
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  androidBackdrop: {
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : Theme.radii.sheet,
    paddingTop: Theme.spacing.md,
  },
  grabHandle: {
    width: 36,
    height: 5,
    backgroundColor: Theme.colors.grabHandle,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
    opacity: 0.7,
  },
  scrollContent: {
    paddingBottom: Theme.spacing.xxl,
  },
  progressSection: {
    width: '100%',
  },
  progressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  secondaryProgressButton: {
    flex: 1,
    height: 48,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryProgressButtonText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelProgressButton: {
    height: 48,
    paddingHorizontal: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelProgressButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  completedContent: {
    width: '100%',
  },
  unifiedHeader: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  authorBadge: {
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
  },
  authorText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  platformBadge: {
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radii.pill,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  crumbCountBadge: {
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radii.pill,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  crumbCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  postSummaryText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  singleCrumbContainer: {
    paddingHorizontal: Theme.spacing.lg,
  },
  singleButtonGroup: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  primaryButton: {
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
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.onPrimary,
  },
  secondaryButton: {
    height: 48,
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  createGuideContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
});
