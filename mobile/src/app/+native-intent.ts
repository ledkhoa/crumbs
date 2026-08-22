/**
 * Expo Router Native Intent Interceptor
 *
 * Intercepts incoming deep links and share intents before Expo Router attempts
 * to match them against filesystem routes, preventing "Unmatched Route" errors
 * when the app is launched via OS Share Extensions or custom scheme callbacks.
 */
export async function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (!path) {
      return '/';
    }

    // If the path is from a share intent, share extension, or unrecognized deep link payload,
    // redirect to root '/' so useShareIntent() in _layout.tsx handles the overlay cleanly.
    const normalized = path.replace(/^crumbs:\/\//, '').replace(/^\/+/, '');

    if (
      path.includes('share') ||
      path.includes('Share') ||
      path.startsWith('file://') ||
      path.includes('expo-sharing') ||
      normalized.startsWith('data=') ||
      normalized.startsWith('sharekey=') ||
      normalized === ''
    ) {
      return '/';
    }

    // Valid known route prefixes
    if (
      path.startsWith('/(tabs)') ||
      path.startsWith('/(auth)') ||
      path.startsWith('/guides') ||
      path.startsWith('/inbox') ||
      path.startsWith('/sign-in') ||
      path.startsWith('/sign-up')
    ) {
      return path;
    }

    // Default fallback to root for any other unrecognized deep links
    return '/';
  } catch {
    return '/';
  }
}
