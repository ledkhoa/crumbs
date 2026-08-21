import { Redirect } from 'expo-router';
import { useSessionStore } from '@/store/session';

export default function Index() {
  const token = useSessionStore((state) => state.token);

  if (!token) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
