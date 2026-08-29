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
import { Theme } from '@/theme/tokens';
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
        <Animated.View style={[styles.breadCircle, breadAnimatedStyle]}>
          <SparkleIcon size={32} color={Theme.colors.primary} weight="fill" />
        </Animated.View>
      </View>

      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Capturing Crumb...</Text>
        <Text style={styles.headerSubtitle}>
          Extracting culinary gems from {platformDisplayName}
        </Text>
      </View>

      {/* 4-Stage Pipeline Card */}
      <View style={styles.pipelineCard}>
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
                    <View style={styles.completedCircle}>
                      <CheckIcon
                        size={12}
                        color={Theme.colors.onPrimary}
                        weight="bold"
                      />
                    </View>
                  )}
                  {isActive && (
                    <Animated.View
                      style={[styles.activeDotOuter, dotAnimatedStyle]}
                    >
                      <View style={styles.activeDotInner} />
                    </Animated.View>
                  )}
                  {!isCompleted && !isActive && (
                    <View style={styles.pendingCircle} />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted && styles.connectorLineCompleted,
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
                      isActive && styles.stepLabelActive,
                      isCompleted && styles.stepLabelCompleted,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {step.sublabel && (
                  <Text
                    style={[
                      styles.stepSublabel,
                      isActive && styles.stepSublabelActive,
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
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  breadEmoji: {
    fontSize: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
  pipelineCard: {
    width: '100%',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.radii.xl,
    borderColor: Theme.colors.cardBorder,
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
    backgroundColor: Theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCheck: {
    color: Theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
  },
  pendingCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Theme.colors.inputBorder,
    backgroundColor: 'transparent',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Theme.colors.inputBorder,
    marginVertical: 2,
  },
  connectorLineCompleted: {
    backgroundColor: Theme.colors.success,
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
    color: Theme.colors.textSubtle,
  },
  stepLabelActive: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  stepLabelCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  stepSublabel: {
    fontSize: 12,
    color: Theme.colors.textSubtle,
    marginTop: 2,
  },
  stepSublabelActive: {
    color: Theme.colors.textMuted,
  },
  activeIndicatorBadge: {
    backgroundColor: Theme.colors.inputBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
  },
  activeIndicatorDots: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    letterSpacing: 1.5,
  },
});
