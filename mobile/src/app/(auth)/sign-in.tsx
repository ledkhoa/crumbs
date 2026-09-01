import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { haptics } from '@/utils/haptics';
import { useSessionStore } from '@/store/session';
import { apiRequest } from '@/utils/api-client';
import { Theme, useTheme } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GrabHandle } from '@/components/ui/GrabHandle';
import { Heading, MutedText } from '@/components/ui/Typography';
import {
  SparkleIcon,
  EnvelopeSimpleIcon,
  LockKeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from 'phosphor-react-native';

const HERO_IMAGE = require('../../../assets/images/hero.jpg');

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignInScreen() {
  const { colors } = useTheme();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setAuthError(null);
      try {
        const response = await apiRequest<{
          token?: string;
          user: { id: string; name: string; email: string; image?: string };
        }>('/auth/sign-in/email', {
          method: 'POST',
          requiresAuth: false,
          body: JSON.stringify({
            email: value.email.trim(),
            password: value.password,
          }),
        });

        if (response.user) {
          haptics.primary();
          setSession({
            user: response.user,
            token: response.token || '',
          });
          router.replace('/(tabs)/(home)');
        }
      } catch (err: unknown) {
        haptics.warning();
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Invalid email or password. Please try again.',
        );
      }
    },
  });

  return (
    <View style={styles.container}>
      {/* Background Hero Image */}
      <Image
        source={HERO_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        transition={200}
      />

      {/* Dark Moody Scrim Overlay */}
      <View style={styles.darkScrim} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <SparkleIcon size={34} color={colors.primary} weight="fill" />
          </View>
          <Text style={styles.logoText}>Crumbs</Text>
          <Text style={styles.taglineText}>Your Living Cravings Guide</Text>
        </View>

        {/* Auth Bottom Sheet Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cardWrapper}
        >
          <Card
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <GrabHandle />

            <Heading style={styles.title}>Welcome back</Heading>
            <MutedText style={styles.subtitle}>
              Sign in to access your curated food collections.
            </MutedText>

            {/* Error Banner */}
            {authError && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: colors.errorBackground,
                    borderColor: colors.errorBorder,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {authError}
                </Text>
              </View>
            )}

            {/* Email Input */}
            <form.Field name="email">
              {(field) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors?.[0]?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={
                    <EnvelopeSimpleIcon
                      size={18}
                      color={colors.textSubtle}
                      weight="bold"
                    />
                  }
                />
              )}
            </form.Field>

            {/* Password Input */}
            <form.Field name="password">
              {(field) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors?.[0]?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  leftIcon={
                    <LockKeyIcon
                      size={18}
                      color={colors.textSubtle}
                      weight="bold"
                    />
                  }
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon
                          size={18}
                          color={colors.textSubtle}
                          weight="bold"
                        />
                      ) : (
                        <EyeIcon
                          size={18}
                          color={colors.textSubtle}
                          weight="bold"
                        />
                      )}
                    </TouchableOpacity>
                  }
                />
              )}
            </form.Field>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => haptics.tap()}
              accessibilityRole="button"
            >
              <Text
                style={[styles.forgotPasswordText, { color: colors.textMuted }]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => form.handleSubmit()}
                  disabled={!canSubmit}
                  loading={isSubmitting}
                  style={styles.primaryButton}
                >
                  Sign in
                </Button>
              )}
            </form.Subscribe>

            {/* Switch to Sign Up */}
            <TouchableOpacity
              style={styles.footerToggle}
              onPress={() => {
                haptics.tap();
                router.push('/(auth)/sign-up');
              }}
            >
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                New to Crumbs?{' '}
                <Text
                  style={[styles.footerHighlight, { color: colors.primary }]}
                >
                  Create account
                </Text>
              </Text>
            </TouchableOpacity>
          </Card>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0A08',
  },
  darkScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 10, 9, 0.58)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
    gap: 4,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 38,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    color: '#FFFDFC',
    letterSpacing: -0.5,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 253, 252, 0.75)',
    letterSpacing: 0.2,
  },
  card: {
    borderTopLeftRadius: Theme.radii.sheet,
    borderTopRightRadius: Theme.radii.sheet,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 44 : Theme.spacing.xxl,
  },
  title: {
    fontSize: 28,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: Theme.spacing.lg,
  },
  errorContainer: {
    borderWidth: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  inputIcon: {
    fontSize: 16,
  },
  eyeButton: {
    padding: Theme.spacing.xs,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButton: {
    marginBottom: Theme.spacing.md,
  },
  footerToggle: {
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  footerText: {
    fontSize: 14,
  },
  footerHighlight: {
    fontWeight: '600',
  },
});
