import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useUnreadCrumbsCount } from '@/hooks/useCrumbs';
import { haptics } from '@/utils/haptics';
import { Theme } from '@/theme/tokens';

export default function TabLayout() {
  const unreadCount = useUnreadCrumbsCount();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
      labelStyle={{
        color: Theme.colors.primary,
      }}
      tintColor={Theme.colors.primary}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="guides">
        <NativeTabs.Trigger.Icon sf="bookmark.fill" md="bookmark" />
        <NativeTabs.Trigger.Label>Guides</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Icon sf="tray.fill" md="inbox" />
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        {unreadCount > 0 && (
          <NativeTabs.Trigger.Badge>
            {String(unreadCount)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
