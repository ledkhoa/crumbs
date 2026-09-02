import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { SparkleIcon } from 'phosphor-react-native';
import { SocialLinkPasteInput } from '@/components/ingestion/SocialLinkPasteInput';

export interface MapOnboardingViewProps {
  onIngestUrl?: (url: string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable onboarding component displayed when a user has zero saved crumbs on their map.
 * Prompts link pasting and introduces the 3-step Crumbs extraction & map lifecycle.
 */
export function MapOnboardingView({
  onIngestUrl,
  contentContainerStyle,
}: MapOnboardingViewProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      nestedScrollEnabled
    >
      <View style={styles.cardContainer}>
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <SparkleIcon size={26} color={colors.primary} weight="fill" />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              },
            ]}
          >
            Your Cravings Map is Fresh
          </Text>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Share food videos from Instagram & TikTok or paste a link below to
            watch your personal city dining map come alive.
          </Text>

          {/* Reusable Link Input Row */}
          <SocialLinkPasteInput
            onSubmit={(url) => onIngestUrl?.(url)}
            placeholder="Paste Instagram or TikTok link..."
          />
        </View>

        {/* How Crumbs Works 3-Step Guide */}
        <View style={styles.stepsContainer}>
          <Text style={[styles.stepsHeading, { color: colors.textMuted }]}>
            HOW CRUMBS WORKS
          </Text>

          <View
            style={[
              styles.stepItemRow,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.stepIconBox,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <Text style={styles.stepEmoji}>📲</Text>
            </View>
            <View style={styles.stepTextBox}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                1. Share or Paste Links
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                Tap share on any food Reel or TikTok and send to Crumbs, or
                paste the link above.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.stepItemRow,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.stepIconBox,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <Text style={styles.stepEmoji}>✨</Text>
            </View>
            <View style={styles.stepTextBox}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                2. Instant AI Extraction
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                AI pinpoints the spot, signature hero dishes, opening hours &
                vibes.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.stepItemRow,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.stepIconBox,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <Text style={styles.stepEmoji}>📍</Text>
            </View>
            <View style={styles.stepTextBox}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                3. Living Cravings Map
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                Pins appear live on your personal map with real-time hours &
                booking links.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  cardContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    gap: Theme.spacing.lg,
  },
  heroCard: {
    padding: Theme.spacing.lg,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  stepsContainer: {
    gap: Theme.spacing.sm,
  },
  stepsHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: Theme.spacing.xs,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    gap: Theme.spacing.md,
  },
  stepIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepTextBox: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
