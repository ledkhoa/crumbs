import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Theme, useTheme } from '@/theme/tokens';
import { SparkleIcon, CheckIcon } from 'phosphor-react-native';
import type { IngestionStep } from '@/types/ingest';

interface IngestionProgressStepsProps {
  steps: IngestionStep[];
  activeStepIndex: number;
  platform?: 'instagram' | 'tiktok' | 'unknown';
}

export function IngestionProgressSteps({
  steps,
  platform = 'instagram',
}: IngestionProgressStepsProps) {
  const { colors } = useTheme();

  // Bread Loaf gentle pulse animation
  const breadScale = useSharedValue(1);

  // Active step glow pulse
  const activeDotPulse = useSharedValue(1);

  useEffect(() => {
    breadScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    activeDotPulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [breadScale, activeDotPulse]);

  const breadAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breadScale.value }],
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeDotPulse.value }],
  }));

  const platformDisplayName =
    platform === 'tiktok'
      ? 'TikTok'
      : platform === 'instagram'
        ? 'Instagram'
        : 'social media';

  return (
    <View style={styles.container}>
      {/* Animated Bread Icon */}
      <View style={styles.breadWrapper}>
        <Animated.View
          style={[
            styles.breadCircle,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
              shadowColor: colors.primary,
            },
            breadAnimatedStyle,
          ]}
        >
          <SparkleIcon size={32} color={colors.primary} weight="fill" />
        </Animated.View>
      </View>

      {/* Header Info */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Capturing Crumb...
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Extracting culinary gems from {platformDisplayName}
        </Text>
      </View>

      {/* 4-Stage Pipeline Card */}
      <View
        style={[
          styles.pipelineCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isLast = index === steps.length - 1;

          return (
            <View key={step.id} style={styles.stepRow}>
              {/* Left Indicator Column */}
              <View style={styles.indicatorCol}>
                <View style={styles.indicatorNode}>
                  {isCompleted && (
                    <View
                      style={[
                        styles.completedCircle,
                        { backgroundColor: colors.success },
                      ]}
                    >
                      <CheckIcon
                        size={12}
                        color={colors.onPrimary}
                        weight="bold"
                      />
                    </View>
                  )}
                  {isActive && (
                    <Animated.View
                      style={[
                        styles.activeDotOuter,
                        { backgroundColor: colors.primaryLight },
                        dotAnimatedStyle,
                      ]}
                    >
                      <View
                        style={[
                          styles.activeDotInner,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    </Animated.View>
                  )}
                  {!isCompleted && !isActive && (
                    <View
                      style={[
                        styles.pendingCircle,
                        { borderColor: colors.inputBorder },
                      ]}
                    />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      { backgroundColor: colors.inputBorder },
                      isCompleted && { backgroundColor: colors.success },
                    ]}
                  />
                )}
              </View>

              {/* Step Content */}
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: colors.textSubtle },
                      isActive && [
                        styles.stepLabelActive,
                        { color: colors.text },
                      ],
                      isCompleted && [
                        styles.stepLabelCompleted,
                        { color: colors.text },
                      ],
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {step.sublabel && (
                  <Text
                    style={[
                      styles.stepSublabel,
                      { color: colors.textSubtle },
                      isActive && [
                        styles.stepSublabelActive,
                        { color: colors.textMuted },
                      ],
                    ]}
                  >
                    {step.sublabel}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.lg,
  },
  breadWrapper: {
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  pipelineCard: {
    width: '100%',
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
  },
  indicatorCol: {
    width: 28,
    alignItems: 'center',
  },
  indicatorNode: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pendingCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepLabelActive: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  stepSublabelActive: {},
});
