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
import { Theme } from '@/theme/tokens';
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

        if (response.token && response.user) {
          setSession({
            token: response.token,
            user: response.user,
          });
          haptics.success();
          router.replace('/(tabs)/(home)');
        }
      } catch (err: any) {
        haptics.error();
        setAuthError(
          err.message || 'Failed to create account. Please try again.',
        );
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Brand */}
        <View style={styles.header}>
          <SparkleIcon size={36} color={Theme.colors.primary} weight="fill" />
          <Text style={styles.logoText}>Crumbs</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          <GrabHandle />

          <Heading style={styles.title}>Create your account</Heading>
          <MutedText style={styles.subtitle}>
            Turn every craving into a place worth going.
          </MutedText>

          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Name Input */}
          <form.Field name="name">
            {(field) => (
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                placeholder="Name"
                autoCapitalize="words"
                leftIcon={
                  <UserIcon
                    size={18}
                    color={Theme.colors.textSubtle}
                    weight="bold"
                  />
                }
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          {/* Email Input */}
          <form.Field name="email">
            {(field) => (
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={
                  <EnvelopeSimpleIcon
                    size={18}
                    color={Theme.colors.textSubtle}
                    weight="bold"
                  />
                }
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          {/* Password Input */}
          <form.Field name="password">
            {(field) => (
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={
                  <LockKeyIcon
                    size={18}
                    color={Theme.colors.textSubtle}
                    weight="bold"
                  />
                }
                rightIcon={
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      haptics.selection();
                    }}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeIcon
                        size={18}
                        color={Theme.colors.textSubtle}
                        weight="bold"
                      />
                    ) : (
                      <EyeSlashIcon
                        size={18}
                        color={Theme.colors.textSubtle}
                        weight="bold"
                      />
                    )}
                  </TouchableOpacity>
                }
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          {/* Terms and conditions checkbox */}
          <form.Field name="agreeToTerms">
            {(field) => (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  field.handleChange(!field.state.value);
                  haptics.selection();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.checkboxIcon}>
                  {field.state.value ? '☑️' : '⬜'}
                </Text>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsUnderline}>
                    Terms & Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </form.Field>

          {/* Submit Button */}
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ isSubmitting }) => (
              <Button
                variant="primary"
                size="lg"
                onPress={() => form.handleSubmit()}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.primaryButton}
              >
                Create account
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
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerHighlight}>Sign in</Text>
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
    backgroundColor: Theme.colors.canvas,
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
    color: Theme.colors.background,
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
    backgroundColor: Theme.colors.errorBackground,
    borderColor: Theme.colors.errorBorder,
    borderWidth: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
    marginBottom: Theme.spacing.md,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  inputIcon: {
    fontSize: 16,
  },
  eyeButton: {
    padding: Theme.spacing.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    marginTop: Theme.spacing.xs,
  },
  checkboxIcon: {
    fontSize: 18,
    marginRight: Theme.spacing.sm,
  },
  termsText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  termsUnderline: {
    textDecorationLine: 'underline',
    color: Theme.colors.text,
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
    color: Theme.colors.textMuted,
  },
  footerHighlight: {
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
