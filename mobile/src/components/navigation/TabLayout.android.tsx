import { Tabs } from 'expo-router';
import { FloatingIslandTabBar } from '@/components/navigation/FloatingIslandTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingIslandTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Map' }} />
      <Tabs.Screen name="guides" options={{ title: 'Guides' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
