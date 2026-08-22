import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useShareIntent } from 'expo-share-intent';
import { extractSocialUrl, isValidSocialUrl } from '@/utils/social-url';
import { IngestionOverlaySheet } from '@/components/ingestion/IngestionOverlaySheet';
import { haptics } from '@/utils/haptics';

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
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
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
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <AppNavigator />
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
    </KeyboardProvider>
  );
}
