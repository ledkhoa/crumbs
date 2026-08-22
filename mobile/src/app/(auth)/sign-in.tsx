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

const signInSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignInScreen() {
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
        setAuthError(err.message || 'Failed to sign in. Please try again.');
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
          <Text style={styles.logoIcon}>🍞</Text>
          <Text style={styles.logoText}>Crumbs</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          <GrabHandle />

          <Heading style={styles.title}>Welcome back</Heading>
          <MutedText style={styles.subtitle}>
            Your next favorite place is waiting.
          </MutedText>

          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

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
                leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
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
                leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      haptics.selection();
                    }}
                    style={styles.eyeButton}
                  >
                    <Text>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                }
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          {/* Forgot password link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => haptics.tap()}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

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
            <Text style={styles.footerText}>
              New to Crumbs?{' '}
              <Text style={styles.footerHighlight}>Create account</Text>
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
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
    color: Theme.colors.textMuted,
  },
  footerHighlight: {
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
