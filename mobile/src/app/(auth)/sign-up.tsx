import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
  UserIcon,
  EnvelopeSimpleIcon,
  LockKeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from 'phosphor-react-native';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
  }),
});

export default function SignUpScreen() {
  const { colors } = useTheme();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      agreeToTerms: false,
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setAuthError(null);
      try {
        const response = await apiRequest<{
          token?: string;
          user: { id: string; name: string; email: string; image?: string };
        }>('/auth/sign-up/email', {
          method: 'POST',
          requiresAuth: false,
          body: JSON.stringify({
            name: value.name.trim(),
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
            : 'Could not create account. Please try again.',
        );
      }
    },
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.canvas }]}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <SparkleIcon size={36} color={colors.primary} weight="fill" />
          <Text style={[styles.logoText, { color: colors.background }]}>
            Crumbs
          </Text>
        </View>

        {/* Auth Bottom Sheet Container */}
        <Card style={styles.card}>
          <GrabHandle />

          <Heading style={styles.title}>Create Account</Heading>
          <MutedText style={styles.subtitle}>
            Join Crumbs to start saving and organizing dining recommendations.
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

          {/* Name Input */}
          <form.Field name="name">
            {(field) => (
              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                error={field.state.meta.errors?.[0]?.message}
                autoCapitalize="words"
                autoCorrect={false}
                leftIcon={
                  <UserIcon size={18} color={colors.textSubtle} weight="bold" />
                }
              />
            )}
          </form.Field>

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
                placeholder="Create a strong password"
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

          {/* Terms Agreement */}
          <form.Field name="agreeToTerms">
            {(field) => (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  haptics.selection();
                  field.handleChange(!field.state.value);
                }}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: field.state.value }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.inputBackground,
                    },
                    field.state.value && [
                      styles.checkboxChecked,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ],
                  ]}
                >
                  {field.state.value && (
                    <Text
                      style={[styles.checkmark, { color: colors.onPrimary }]}
                    >
                      ✓
                    </Text>
                  )}
                </View>
                <Text style={[styles.termsText, { color: colors.textMuted }]}>
                  I agree to the{' '}
                  <Text style={[styles.termsLink, { color: colors.text }]}>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text style={[styles.termsLink, { color: colors.text }]}>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </form.Field>

          {/* Sign Up Button */}
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
                Create Account
              </Button>
            )}
          </form.Subscribe>

          {/* Switch to Sign In */}
          <TouchableOpacity
            style={styles.footerToggle}
            onPress={() => {
              haptics.tap();
              router.back();
            }}
          >
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Already have an account?{' '}
              <Text style={[styles.footerHighlight, { color: colors.primary }]}>
                Sign in
              </Text>
            </Text>
          </TouchableOpacity>
        </Card>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  logoIcon: {
    fontSize: 42,
    marginBottom: Theme.spacing.xs,
  },
  logoText: {
    fontSize: 38,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
  },
  card: {
    borderTopLeftRadius: Theme.radii.sheet,
    borderTopRightRadius: Theme.radii.sheet,
    borderBottomLeftRadius: Theme.radii.sheet,
    borderBottomRightRadius: Theme.radii.sheet,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {},
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 13,
    flex: 1,
  },
  termsLink: {
    fontWeight: '600',
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
