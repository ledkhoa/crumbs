import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { AppState, StyleSheet, type AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useShareIntent } from 'expo-share-intent';
import { extractSocialUrl, isValidSocialUrl } from '@/utils/social-url';
import { IngestionOverlaySheet } from '@/components/ingestion/IngestionOverlaySheet';
import { BackgroundIngestionPoller } from '@/components/ingestion/BackgroundIngestionPoller';
import { InAppToastBanner } from '@/components/inbox/InAppToastBanner';
import { QuickAddToGuideModal } from '@/components/ingestion/QuickAddToGuideModal';
import { AppKeyboardToolbar } from '@/components/ui/AppKeyboardToolbar';
import { useInboxStore } from '@/store/inbox';
import { useAddCrumbToGuideMutation } from '@/hooks/useGuides';
import { useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import type { UnifiedRestaurantSpot } from '@/types/ingest';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Configure TanStack Query focus manager for React Native AppState
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => {
      handleFocus(status === 'active');
    },
  );

  return () => subscription.remove();
});

function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="crumbs/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="guides/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

function GlobalOverlays() {
  const router = useRouter();
  const activeToast = useInboxStore((state) => state.activeToast);
  const hideToast = useInboxStore((state) => state.hideToast);
  const addCrumbMutation = useAddCrumbToGuideMutation();

  const [toastGuideTarget, setToastGuideTarget] =
    useState<UnifiedRestaurantSpot | null>(null);

  const handleToastAddToGuide = (restaurant: UnifiedRestaurantSpot) => {
    setToastGuideTarget(restaurant);
  };

  const handleToastViewInInbox = (_restaurant: UnifiedRestaurantSpot) => {
    router.push('/(tabs)/inbox');
  };

  const handleGuideSelected = async (guideId: string) => {
    if (toastGuideTarget) {
      const crumbId = toastGuideTarget.crumbId || toastGuideTarget.id;
      if (crumbId) {
        try {
          await addCrumbMutation.mutateAsync({
            guideId,
            crumbIds: [crumbId],
          });
        } catch (err) {
          console.warn('[RootLayout] Failed to add toast crumb to guide:', err);
        }
      }
    }
    setToastGuideTarget(null);
  };

  return (
    <>
      <BackgroundIngestionPoller />

      <InAppToastBanner
        toast={activeToast}
        onDismiss={hideToast}
        onAddToGuide={handleToastAddToGuide}
        onViewInInbox={handleToastViewInInbox}
      />

      {toastGuideTarget && (
        <QuickAddToGuideModal
          visible={Boolean(toastGuideTarget)}
          restaurantName={toastGuideTarget.name}
          crumbId={toastGuideTarget.crumbId || toastGuideTarget.id}
          onClose={() => setToastGuideTarget(null)}
          onGuideSelected={handleGuideSelected}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });

  const [overlayState, setOverlayState] = useState<{
    visible: boolean;
    sourceUrl: string;
    initialCaption?: string;
  }>({
    visible: false,
    sourceUrl: '',
  });

  useEffect(() => {
    if (hasShareIntent) {
      const sharedContent = shareIntent.text || shareIntent.webUrl;
      if (sharedContent) {
        const extracted = extractSocialUrl(sharedContent);
        if (extracted.url && isValidSocialUrl(extracted.url)) {
          haptics.tap();
          setOverlayState({
            visible: true,
            sourceUrl: extracted.url,
            initialCaption: extracted.initialCaption,
          });
        }
      }
    }
  }, [hasShareIntent, shareIntent]);

  const handleCloseOverlay = () => {
    setOverlayState((prev) => ({ ...prev, visible: false }));
    resetShareIntent();
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <AppNavigator />
          <GlobalOverlays />
          {overlayState.visible && (
            <IngestionOverlaySheet
              visible={overlayState.visible}
              sourceUrl={overlayState.sourceUrl}
              initialCaption={overlayState.initialCaption}
              onClose={handleCloseOverlay}
              onNavigateToInbox={(_crumbId) => {
                handleCloseOverlay();
                router.push('/(tabs)/inbox');
              }}
            />
          )}
        </QueryClientProvider>
        <AppKeyboardToolbar />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
