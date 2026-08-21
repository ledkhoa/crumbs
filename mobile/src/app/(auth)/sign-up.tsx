import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { haptics } from '@/utils/haptics';
import { useSessionStore } from '@/store/session';
import { apiRequest } from '@/utils/api-client';
import { Theme } from '@/theme/tokens';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms and Privacy Policy',
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.scrollContent}>
          {/* Header Brand */}
          <View style={styles.header}>
            <Text style={styles.logoIcon}>🍞</Text>
            <Text style={styles.logoText}>Crumbs</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Grab Handle */}
            <View style={styles.grabHandle} />

            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Turn every craving into a place worth going.
            </Text>

            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* Name Input */}
            <form.Field name="name">
              {(field) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="Name"
                    placeholderTextColor={Theme.colors.textMuted}
                    autoCapitalize="words"
                    style={styles.input}
                  />
                  {field.state.meta.errors[0] && (
                    <Text style={styles.fieldError}>
                      {field.state.meta.errors[0].message}
                    </Text>
                  )}
                </View>
              )}
            </form.Field>

            {/* Email Input */}
            <form.Field name="email">
              {(field) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="Email"
                    placeholderTextColor={Theme.colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  {field.state.meta.errors[0] && (
                    <Text style={styles.fieldError}>
                      {field.state.meta.errors[0].message}
                    </Text>
                  )}
                </View>
              )}
            </form.Field>

            {/* Password Input */}
            <form.Field name="password">
              {(field) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="Password"
                    placeholderTextColor={Theme.colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowPassword(!showPassword);
                      haptics.selection();
                    }}
                    style={styles.eyeButton}
                  >
                    <Text>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                  {field.state.meta.errors[0] && (
                    <Text style={styles.fieldError}>
                      {field.state.meta.errors[0].message}
                    </Text>
                  )}
                </View>
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
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    haptics.primary();
                    form.handleSubmit();
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Theme.colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create account</Text>
                  )}
                </TouchableOpacity>
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
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
    backgroundColor: Theme.colors.cardBackground,
    borderTopLeftRadius: Theme.radii.sheet,
    borderTopRightRadius: Theme.radii.sheet,
    borderBottomLeftRadius: Theme.radii.sheet,
    borderBottomRightRadius: Theme.radii.sheet,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  grabHandle: {
    width: 44,
    height: 5,
    backgroundColor: Theme.colors.grabHandle,
    borderRadius: Theme.radii.pill,
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    marginBottom: Theme.spacing.md,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Theme.colors.text,
  },
  eyeButton: {
    padding: Theme.spacing.xs,
  },
  fieldError: {
    position: 'absolute',
    bottom: -18,
    left: Theme.spacing.md,
    color: Theme.colors.error,
    fontSize: 11,
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
    color: Theme.colors.text,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    height: 52,
    borderRadius: Theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: Theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
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
