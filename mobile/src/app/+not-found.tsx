import { Redirect } from 'expo-router';

/**
 * Global 404 / NotFound Route Handler
 * Gracefully redirects unmatched or missing routes back to root.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
