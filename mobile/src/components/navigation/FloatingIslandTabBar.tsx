import { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapTrifold,
  BookmarkSimple,
  Tray,
  UserCircle,
} from 'phosphor-react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { useUnreadCrumbsCount } from '@/hooks/useCrumbs';
import { haptics } from '@/utils/haptics';

export type FloatingIslandTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

function getTabConfig(routeName: string) {
  const normalized = routeName.replace(/\/index$/, '');
  if (
    normalized === '(home)' ||
    normalized === 'index' ||
    normalized === '' ||
    normalized.includes('home')
  ) {
    return { label: 'Map', Icon: MapTrifold };
  }
  if (normalized.includes('guides')) {
    return { label: 'Guides', Icon: BookmarkSimple };
  }
  if (normalized.includes('inbox')) {
    return { label: 'Inbox', Icon: Tray };
  }
  if (normalized.includes('profile')) {
    return { label: 'Profile', Icon: UserCircle };
  }
  return { label: routeName, Icon: MapTrifold };
}

export const FloatingIslandTabBar = memo(function FloatingIslandTabBar({
  state,
  descriptors,
  navigation,
}: FloatingIslandTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCrumbsCount();

  const bottomOffset = Math.max(insets.bottom, 12) + 6;

  return (
    <View
      style={[
        styles.islandContainer,
        {
          bottom: bottomOffset,
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0.35 : 0.12,
        },
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = getTabConfig(route.name);

        if (!config) {
          return null;
        }

        const { label, Icon } = config;
        const isInbox = route.name.includes('inbox');

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name, route.params);
          }
        };

        const iconColor = isFocused ? colors.primary : colors.textMuted;
        const labelColor = isFocused ? colors.primary : colors.textMuted;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={
              descriptors[route.key]?.options?.tabBarAccessibilityLabel ||
              `${label} tab`
            }
          >
            <View
              style={[
                styles.tabContent,
                isFocused && [styles.activeTabContent],
              ]}
            >
              <View style={styles.iconWrapper}>
                <Icon
                  size={20}
                  color={iconColor}
                  weight={isFocused ? 'fill' : 'regular'}
                />

                {isInbox && unreadCount > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.cardBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.badgeText, { color: colors.onPrimary }]}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: labelColor,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  islandContainer: {
    position: 'absolute',
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    maxWidth: 400,
    alignSelf: 'center',
    height: 58,
    borderRadius: Theme.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 10,
    zIndex: 100,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.radii.pill,
  },
  activeTabContent: {
    paddingHorizontal: 16,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
