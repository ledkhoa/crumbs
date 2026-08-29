import { useColorScheme } from 'react-native';

export const LightColors = {
  primary: '#C45B3E',
  primaryPressed: '#A84B31',
  primaryLight: '#E89078',
  onPrimary: '#FFFFFF',

  background: '#F7F4EF',
  canvas: '#1E1915',
  cardBackground: '#FFFFFF',
  inputBackground: '#F0EAE1',
  inputBorder: '#D8CEBF',

  // Card borders with clear contrast against #F7F4EF background
  cardBorder: '#DDD5CA',
  grabHandle: '#C5B9A8',

  // Switch tokens for high-contrast on/off states
  switchTrackOff: '#CDC2B2',
  switchThumbOff: '#FFFFFF',

  text: '#1A1715',
  textMuted: '#736B63',
  textSubtle: '#9E958C',

  appleButton: '#1C1917',
  googleButton: '#F7F4EF',
  googleBorder: '#DDD5CA',

  success: '#7C9070',
  accent: '#DFB064',
  error: '#DC2626',
  errorBackground: 'rgba(220, 38, 38, 0.1)',
  errorBorder: 'rgba(220, 38, 38, 0.2)',

  shadow: '#000000',
} as const;

export type ThemeColors = {
  [K in keyof typeof LightColors]: string;
};

export const DarkColors: ThemeColors = {
  primary: '#D6684B',
  primaryPressed: '#B34F36',
  primaryLight: '#E89078',
  onPrimary: '#FFFFFF',

  background: '#141210',
  canvas: '#1A1714',
  cardBackground: '#1F1B17',
  inputBackground: '#27221E',
  inputBorder: '#3B332B',

  cardBorder: '#2E2822',
  grabHandle: '#4A4137',

  switchTrackOff: '#3D352C',
  switchThumbOff: '#A89F94',

  text: '#F5F2EC',
  textMuted: '#A69E93',
  textSubtle: '#736A5E',

  appleButton: '#FFFFFF',
  googleButton: '#1F1B17',
  googleBorder: '#2E2822',

  success: '#8CA47E',
  accent: '#DFB064',
  error: '#EF4444',
  errorBackground: 'rgba(239, 68, 68, 0.15)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',

  shadow: '#000000',
};

export const ThemeCommon = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radii: {
    sm: 8,
    md: 14,
    lg: 18,
    xl: 24,
    sheet: 36,
    pill: 999,
  },
} as const;

export const Theme = {
  colors: LightColors,
  ...ThemeCommon,
};

/**
 * Hook to access the current system-adaptive theme colors and tokens.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? DarkColors : LightColors,
    ...ThemeCommon,
  };
}
