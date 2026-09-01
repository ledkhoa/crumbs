import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { useSessionStore } from '@/store/session';
import { useCrumbsCountsQuery } from '@/hooks/useCrumbs';
import { useGuidesQuery } from '@/hooks/useGuides';
import {
  SignOutIcon,
  SparkleIcon,
  BookmarkSimpleIcon,
  EnvelopeSimpleIcon,
  UserIcon,
  ShieldCheckIcon,
} from 'phosphor-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);

  const [isSigningOut, setIsSigningOut] = useState(false);

  // User Curation Statistics
  const { data: countsData } = useCrumbsCountsQuery();
  const { data: guidesData } = useGuidesQuery();

  const totalCrumbs = countsData?.counts.all ?? 0;
  const totalGuides = guidesData?.length ?? 0;

  const handleSignOut = () => {
    haptics.heavy();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Crumbs?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => haptics.tap(),
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              haptics.success();
              // Clear cached queries to prevent stale data leaking between accounts
              queryClient.clear();
              // Clear stored credentials
              clearSession();
              // Navigate back to auth screen
              router.replace('/(auth)/sign-in');
            } catch (err) {
              console.warn('[ProfileScreen] Sign out error:', err);
              setIsSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'C';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              },
            ]}
          >
            Profile
          </Text>
        </View>

        {/* User Identity Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.avatarInitial, { color: colors.onPrimary }]}>
              {userInitial}
            </Text>
          </View>

          <View style={styles.userInfoCol}>
            <Text
              style={[
                styles.userName,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                },
              ]}
              numberOfLines={1}
            >
              {user?.name || 'Foodie Explorer'}
            </Text>
            <Text
              style={[styles.userEmail, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {user?.email || 'No email attached'}
            </Text>
          </View>
        </View>

        {/* Curation Overview Stats Card */}
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.statCol}>
            <View style={styles.statIconBadge}>
              <SparkleIcon size={16} color={colors.primary} weight="fill" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalCrumbs}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Crumbs Saved
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: colors.cardBorder }]}
          />

          <View style={styles.statCol}>
            <View style={styles.statIconBadge}>
              <BookmarkSimpleIcon
                size={16}
                color={colors.primary}
                weight="fill"
              />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalGuides}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Active Guides
            </Text>
          </View>
        </View>

        {/* Account Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            ACCOUNT
          </Text>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoLeading}>
                <EnvelopeSimpleIcon size={18} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  Email
                </Text>
              </View>
              <Text
                style={[styles.infoValue, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {user?.email || '—'}
              </Text>
            </View>

            <View
              style={[
                styles.rowDivider,
                { backgroundColor: colors.cardBorder },
              ]}
            />

            <View style={styles.infoRow}>
              <View style={styles.infoLeading}>
                <UserIcon size={18} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  User ID
                </Text>
              </View>
              <Text
                style={[styles.infoValue, { color: colors.textSubtle }]}
                numberOfLines={1}
              >
                {user?.id ? `${user.id.slice(0, 12)}...` : '—'}
              </Text>
            </View>

            <View
              style={[
                styles.rowDivider,
                { backgroundColor: colors.cardBorder },
              ]}
            />

            <View style={styles.infoRow}>
              <View style={styles.infoLeading}>
                <ShieldCheckIcon size={18} color={colors.textMuted} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>
                  App Version
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textMuted }]}>
                1.0.0 (Build 57)
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out Action (Distinct Ghost/Outline Danger Button) */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              {
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBackground,
              },
            ]}
            onPress={handleSignOut}
            disabled={isSigningOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign out of account"
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <SignOutIcon size={18} color={colors.error} weight="bold" />
                <Text style={[styles.signOutText, { color: colors.error }]}>
                  Sign Out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: 48,
    gap: Theme.spacing.xl,
  },
  header: {
    paddingVertical: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    gap: Theme.spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 44,
  },
  statIconBadge: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    gap: Theme.spacing.xs,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: Theme.spacing.xs,
  },
  sectionCard: {
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  infoLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '400',
    maxWidth: '60%',
  },
  rowDivider: {
    height: 1,
    marginLeft: Theme.spacing.md + 26,
  },
  signOutSection: {
    marginTop: Theme.spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    gap: Theme.spacing.xs,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
